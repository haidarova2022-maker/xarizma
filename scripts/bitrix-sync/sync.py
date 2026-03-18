"""Sync logic: incremental and full synchronization."""

from __future__ import annotations

import logging
from config import DEAL_SELECT_FIELDS, BOOKING_PIPELINE_ID
from bitrix_client import iter_deals
from mappers import map_deal_to_booking
from db import (
    get_connection, ensure_schema,
    upsert_bookings_batch, get_sync_state, set_sync_state, get_booking_count,
)

logger = logging.getLogger(__name__)

SYNC_STATE_KEY = "last_sync_datetime"
UPSERT_BATCH_SIZE = 500  # write to DB every N bookings


def _flush_batch(conn, batch, total_counts):
    """Flush a batch to DB with reconnect on failure. Returns (conn, counts)."""
    import psycopg2
    try:
        counts = upsert_bookings_batch(conn, batch)
        for k in total_counts:
            if k in counts:
                total_counts[k] += counts[k]
        return conn
    except (psycopg2.InterfaceError, psycopg2.OperationalError) as e:
        logger.warning(f"DB connection lost: {e}. Reconnecting...")
        try:
            conn.close()
        except Exception:
            pass
        conn = get_connection()
        # Retry the batch
        try:
            counts = upsert_bookings_batch(conn, batch)
            for k in total_counts:
                if k in counts:
                    total_counts[k] += counts[k]
        except Exception as e2:
            logger.error(f"Retry batch failed: {e2}")
            total_counts["errors"] += len(batch)
        return conn


def _process_deals_streaming(
    conn,
    deal_iter,
    dry_run: bool = False,
):
    """Process deals from iterator, upsert in batches. Returns (counts, conn)."""
    total_counts = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
    max_modify_date = None
    batch = []
    total_deals = 0
    total_mapped = 0

    for deal in deal_iter:
        total_deals += 1
        booking = map_deal_to_booking(deal)

        if booking:
            total_mapped += 1
            mod_date = deal.get("DATE_MODIFY")
            if mod_date and (not max_modify_date or mod_date > max_modify_date):
                max_modify_date = mod_date

            if dry_run:
                _log_dry_run(deal, booking)
            else:
                batch.append(booking)

        # Flush batch to DB
        if not dry_run and conn and len(batch) >= UPSERT_BATCH_SIZE:
            conn = _flush_batch(conn, batch, total_counts)
            logger.info(
                f"Batch upserted | "
                f"Total: {total_deals} deals, {total_mapped} mapped, "
                f"{total_counts['inserted']} ins, {total_counts['updated']} upd"
            )
            batch = []

    # Flush remaining
    if not dry_run and conn and batch:
        conn = _flush_batch(conn, batch, total_counts)

    total_counts["skipped"] += total_deals - total_mapped
    logger.info(f"Processed {total_deals} deals, mapped {total_mapped} bookings")

    return {**total_counts, "_max_modify_date": max_modify_date, "_conn": conn}


def run_full_sync(dry_run: bool = False, limit: int | None = None):
    """Full sync: fetch all deals from booking pipeline, write in batches."""
    logger.info("=== FULL SYNC START ===")

    conn = None
    if not dry_run:
        conn = get_connection()
        ensure_schema(conn)

    logger.info(f"Streaming deals from pipeline {BOOKING_PIPELINE_ID}...")
    deal_iter = iter_deals(
        category_id=BOOKING_PIPELINE_ID,
        select=DEAL_SELECT_FIELDS,
        limit=limit,
    )

    result = _process_deals_streaming(conn, deal_iter, dry_run=dry_run)
    max_modify_date = result.pop("_max_modify_date")
    conn = result.pop("_conn", conn)

    # Save sync state
    if not dry_run and conn and max_modify_date:
        set_sync_state(conn, SYNC_STATE_KEY, max_modify_date)
        logger.info(f"Saved last sync datetime: {max_modify_date}")

    if conn:
        total_in_db = get_booking_count(conn)
        conn.close()
        logger.info(f"Total Bitrix bookings in DB: {total_in_db}")

    logger.info(f"=== FULL SYNC DONE === {result}")
    return result


def run_incremental_sync(dry_run: bool = False, limit: int | None = None):
    """Incremental sync: fetch only deals modified since last sync."""
    logger.info("=== INCREMENTAL SYNC START ===")

    conn = get_connection()
    ensure_schema(conn)

    last_sync = get_sync_state(conn, SYNC_STATE_KEY)
    if not last_sync:
        logger.info("No previous sync state found — running full sync")
        conn.close()
        return run_full_sync(dry_run=dry_run, limit=limit)

    logger.info(f"Last sync: {last_sync}")

    deal_iter = iter_deals(
        category_id=BOOKING_PIPELINE_ID,
        modified_since=last_sync,
        select=DEAL_SELECT_FIELDS,
        limit=limit,
    )

    result = _process_deals_streaming(conn, deal_iter, dry_run=dry_run)
    max_modify_date = result.pop("_max_modify_date")
    conn = result.pop("_conn", conn)

    # Update sync state
    if not dry_run and max_modify_date and max_modify_date != last_sync:
        set_sync_state(conn, SYNC_STATE_KEY, max_modify_date)
        logger.info(f"Updated last sync datetime: {max_modify_date}")

    total_in_db = get_booking_count(conn)
    conn.close()

    logger.info(f"Total Bitrix bookings in DB: {total_in_db}")
    logger.info(f"=== INCREMENTAL SYNC DONE === {result}")
    return result


def _log_dry_run(deal: dict, booking: dict):
    """Log a mapped booking in dry-run mode."""
    logger.info(
        f"  [DRY RUN] Deal {deal.get('ID')} → "
        f"branch={booking['branch_id']}, "
        f"status={booking['status']}, "
        f"source={booking['source']}, "
        f"price={booking['total_price']}, "
        f"guests={booking['guest_count']}, "
        f"guest={booking['guest_name']}, "
        f"time={booking.get('start_time', '?')}..{booking.get('end_time', '?')}"
    )
