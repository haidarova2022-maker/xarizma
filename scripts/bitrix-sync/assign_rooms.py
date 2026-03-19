"""Assign room_id to bookings using smart auto-distribution.

Algorithm per branch:
1. Get all rooms sorted by capacity
2. Get all bookings with room_id IS NULL, sorted by start_time
3. For each booking, find the best-fit room:
   a. Room capacity >= guest_count
   b. Room has no overlap with other bookings already assigned
   c. If all rooms overlap, pick the one with least overlap
4. UPDATE room_id in DB
"""

from __future__ import annotations

import logging
import sys
import os
from collections import defaultdict
from datetime import datetime
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import DATABASE_URL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def run_room_assignment(dry_run: bool = False):
    """Main entry: auto-distribute bookings across rooms by capacity + time."""
    import psycopg2

    logger.info("=== ROOM AUTO-ASSIGNMENT START ===")

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # 1. Get all rooms grouped by branch
    cur.execute("""
        SELECT id, name, category, branch_id, capacity_max
        FROM rooms ORDER BY branch_id, capacity_max ASC, id ASC
    """)
    all_rooms = cur.fetchall()
    rooms_by_branch: dict[int, list[dict]] = defaultdict(list)
    for r in all_rooms:
        rooms_by_branch[r[3]].append({
            "id": r[0], "name": r[1], "category": r[2],
            "branch_id": r[3], "capacity_max": r[4],
        })

    logger.info(f"Rooms: {len(all_rooms)} across {len(rooms_by_branch)} branches")

    # 2. Get all bookings with room_id IS NULL, grouped by branch
    cur.execute("""
        SELECT id, branch_id, guest_count, start_time, end_time
        FROM bookings
        WHERE room_id IS NULL AND branch_id IS NOT NULL
          AND start_time IS NOT NULL AND end_time IS NOT NULL
          AND status != 'cancelled'
        ORDER BY branch_id, start_time
    """)
    bookings = cur.fetchall()
    logger.info(f"Bookings to assign: {len(bookings)}")

    bookings_by_branch: dict[int, list[dict]] = defaultdict(list)
    for b in bookings:
        bookings_by_branch[b[1]].append({
            "id": b[0], "branch_id": b[1], "guest_count": b[2] or 1,
            "start_time": b[3], "end_time": b[4],
        })

    # 3. Assign rooms per branch
    updates: list[tuple[int, int]] = []  # (room_id, booking_id)
    stats = {"assigned": 0, "no_room": 0}

    for branch_id, branch_rooms in rooms_by_branch.items():
        branch_bookings = bookings_by_branch.get(branch_id, [])
        if not branch_bookings:
            continue

        logger.info(f"Branch {branch_id}: {len(branch_bookings)} bookings → {len(branch_rooms)} rooms")

        # Track room occupancy: room_id → list of (start, end) intervals
        room_schedule: dict[int, list[tuple[datetime, datetime]]] = {
            r["id"]: [] for r in branch_rooms
        }

        # Also load existing assigned bookings for this branch to avoid double-booking
        cur.execute("""
            SELECT room_id, start_time, end_time FROM bookings
            WHERE branch_id = %s AND room_id IS NOT NULL
              AND start_time IS NOT NULL AND end_time IS NOT NULL
              AND status != 'cancelled'
        """, (branch_id,))
        for row in cur.fetchall():
            if row[0] in room_schedule:
                room_schedule[row[0]].append((row[1], row[2]))

        for booking in branch_bookings:
            best_room_id = _find_best_room(
                branch_rooms, room_schedule,
                booking["guest_count"],
                booking["start_time"], booking["end_time"],
            )
            if best_room_id:
                updates.append((best_room_id, booking["id"]))
                room_schedule[best_room_id].append(
                    (booking["start_time"], booking["end_time"])
                )
                stats["assigned"] += 1
            else:
                stats["no_room"] += 1

    logger.info(f"Assignments ready: {stats['assigned']}, no room: {stats['no_room']}")

    # 4. Apply updates using bulk UPDATE with VALUES
    if dry_run:
        logger.info(f"[DRY RUN] Would update {len(updates)} bookings")
        for room_id, booking_id in updates[:10]:
            logger.info(f"  booking {booking_id} → room {room_id}")
    else:
        batch_size = 2000
        applied = 0
        for i in range(0, len(updates), batch_size):
            chunk = updates[i:i + batch_size]
            # Bulk UPDATE using unnest
            room_ids = [r for r, _ in chunk]
            booking_ids = [b for _, b in chunk]
            cur.execute("""
                UPDATE bookings AS b
                SET room_id = v.room_id
                FROM (SELECT unnest(%s::int[]) AS room_id, unnest(%s::int[]) AS booking_id) AS v
                WHERE b.id = v.booking_id
            """, (room_ids, booking_ids))
            conn.commit()
            applied += len(chunk)
            logger.info(f"  Applied {applied}/{len(updates)}")

        logger.info(f"Total updated: {applied}")

    # Final stats
    cur.execute("SELECT COUNT(*) FROM bookings WHERE room_id IS NOT NULL")
    with_room = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM bookings WHERE room_id IS NULL AND status != 'cancelled'")
    without_room = cur.fetchone()[0]
    logger.info(f"Final: {with_room} with room, {without_room} without room (non-cancelled)")

    cur.close()
    conn.close()
    logger.info("=== ROOM AUTO-ASSIGNMENT DONE ===")
    return stats


def _find_best_room(
    rooms: list[dict],
    schedule: dict[int, list[tuple[datetime, datetime]]],
    guest_count: int,
    start: datetime,
    end: datetime,
) -> int | None:
    """Find the best room for a booking.

    Priority:
    1. Fits capacity AND no time overlap
    2. Any room with no overlap (even if too small)
    3. Fits capacity (accept overlap)
    4. Any room (last resort)
    """
    # Sort rooms: prefer rooms where capacity >= guest_count, then by capacity ascending
    fitting = [r for r in rooms if r["capacity_max"] >= guest_count]
    non_fitting = [r for r in rooms if r["capacity_max"] < guest_count]

    # Try fitting rooms first (no overlap)
    for r in fitting:
        if not _has_overlap(schedule[r["id"]], start, end):
            return r["id"]

    # Try non-fitting rooms (no overlap)
    for r in non_fitting:
        if not _has_overlap(schedule[r["id"]], start, end):
            return r["id"]

    # All rooms have overlap — pick fitting room with least overlap
    if fitting:
        best = min(fitting, key=lambda r: _count_overlaps(schedule[r["id"]], start, end))
        return best["id"]

    # Last resort: any room
    if rooms:
        best = min(rooms, key=lambda r: _count_overlaps(schedule[r["id"]], start, end))
        return best["id"]

    return None


def _has_overlap(intervals: list[tuple[datetime, datetime]], start: datetime, end: datetime) -> bool:
    """Check if (start, end) overlaps with any interval."""
    for s, e in intervals:
        if start < e and end > s:
            return True
    return False


def _count_overlaps(intervals: list[tuple[datetime, datetime]], start: datetime, end: datetime) -> int:
    """Count how many intervals overlap with (start, end)."""
    count = 0
    for s, e in intervals:
        if start < e and end > s:
            count += 1
    return count


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Auto-assign rooms to bookings")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB")
    args = parser.parse_args()
    run_room_assignment(dry_run=args.dry_run)
