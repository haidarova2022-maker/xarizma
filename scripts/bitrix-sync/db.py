"""PostgreSQL operations: upsert bookings, sync state, schema management."""

from __future__ import annotations

import logging
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values
from config import DATABASE_URL

logger = logging.getLogger(__name__)


def get_connection():
    """Create a new database connection."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set")
    return psycopg2.connect(DATABASE_URL)


def ensure_schema(conn):
    """Create required indexes and tables if they don't exist."""
    with conn.cursor() as cur:
        # Allow NULL room_id for Bitrix-synced bookings (room resolution pending)
        cur.execute("""
            ALTER TABLE bookings ALTER COLUMN room_id DROP NOT NULL
        """)

        # Unique index on bitrix_deal_id for upsert
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_bitrix_deal_id
            ON bookings (bitrix_deal_id) WHERE bitrix_deal_id IS NOT NULL
        """)

        # Sync state table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sync_state (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

    conn.commit()
    logger.info("Schema ensured (index + sync_state table)")


def upsert_booking(conn, booking: dict) -> str:
    """Insert or update a single booking by bitrix_deal_id.

    Returns: 'inserted', 'updated', or 'skipped'
    """
    if not booking.get("bitrix_deal_id"):
        return "skipped"

    if not booking.get("start_time") or not booking.get("end_time"):
        logger.debug(f"Skipping deal {booking['bitrix_deal_id']}: no start/end time")
        return "skipped"

    # Remove internal fields not meant for DB
    db_booking = {k: v for k, v in booking.items() if not k.startswith("_")}

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO bookings (
                bitrix_deal_id, branch_id, room_id, booking_type, status,
                start_time, end_time, guest_count,
                guest_name, guest_phone, guest_email, guest_comment,
                base_price, discount_amount, total_price,
                prepayment_amount, payment_status, source,
                created_at, updated_at
            ) VALUES (
                %(bitrix_deal_id)s, %(branch_id)s, %(room_id)s, %(booking_type)s, %(status)s,
                %(start_time)s, %(end_time)s, %(guest_count)s,
                %(guest_name)s, %(guest_phone)s, %(guest_email)s, %(guest_comment)s,
                %(base_price)s, %(discount_amount)s, %(total_price)s,
                %(prepayment_amount)s, %(payment_status)s, %(source)s,
                COALESCE(%(created_at)s::timestamp, NOW()),
                COALESCE(%(updated_at)s::timestamp, NOW())
            )
            ON CONFLICT (bitrix_deal_id) WHERE bitrix_deal_id IS NOT NULL
            DO UPDATE SET
                status = EXCLUDED.status,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                guest_count = EXCLUDED.guest_count,
                guest_name = EXCLUDED.guest_name,
                guest_phone = EXCLUDED.guest_phone,
                guest_email = EXCLUDED.guest_email,
                guest_comment = EXCLUDED.guest_comment,
                total_price = EXCLUDED.total_price,
                prepayment_amount = EXCLUDED.prepayment_amount,
                payment_status = EXCLUDED.payment_status,
                source = EXCLUDED.source,
                updated_at = COALESCE(EXCLUDED.updated_at, NOW())
            RETURNING (xmax = 0) AS is_insert
        """, db_booking)

        row = cur.fetchone()
        if row is None:
            return "skipped"
        return "inserted" if row[0] else "updated"


UPSERT_COLUMNS = [
    "bitrix_deal_id", "branch_id", "room_id", "booking_type", "status",
    "start_time", "end_time", "guest_count",
    "guest_name", "guest_phone", "guest_email", "guest_comment",
    "base_price", "discount_amount", "total_price",
    "prepayment_amount", "payment_status", "source",
    "created_at", "updated_at",
]


def upsert_bookings_batch(conn, bookings: list[dict]) -> dict:
    """Bulk upsert bookings using execute_values for speed."""
    counts = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}

    # Filter valid bookings
    valid = []
    for b in bookings:
        if not b.get("bitrix_deal_id") or not b.get("start_time") or not b.get("end_time"):
            counts["skipped"] += 1
            continue
        valid.append(b)

    if not valid:
        return counts

    # Build values tuples
    rows = []
    for b in valid:
        db = {k: v for k, v in b.items() if not k.startswith("_")}
        rows.append(tuple(db.get(col) for col in UPSERT_COLUMNS))

    cols = ", ".join(UPSERT_COLUMNS)
    placeholders = ", ".join(["%s"] * len(UPSERT_COLUMNS))

    sql = f"""
        INSERT INTO bookings ({cols})
        VALUES %s
        ON CONFLICT (bitrix_deal_id) WHERE bitrix_deal_id IS NOT NULL
        DO UPDATE SET
            status = EXCLUDED.status,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            guest_count = EXCLUDED.guest_count,
            guest_name = EXCLUDED.guest_name,
            guest_phone = EXCLUDED.guest_phone,
            guest_email = EXCLUDED.guest_email,
            guest_comment = EXCLUDED.guest_comment,
            total_price = EXCLUDED.total_price,
            prepayment_amount = EXCLUDED.prepayment_amount,
            payment_status = EXCLUDED.payment_status,
            source = EXCLUDED.source,
            updated_at = COALESCE(EXCLUDED.updated_at, NOW())
    """

    try:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=len(rows))
        conn.commit()
        counts["inserted"] = len(valid)  # approximate — bulk doesn't distinguish
    except (psycopg2.InterfaceError, psycopg2.OperationalError):
        raise
    except Exception as e:
        logger.error(f"Bulk upsert error: {e}")
        counts["errors"] = len(valid)
        try:
            conn.rollback()
        except Exception:
            pass

    return counts


def get_sync_state(conn, key: str) -> str | None:
    """Get a value from sync_state table."""
    with conn.cursor() as cur:
        cur.execute("SELECT value FROM sync_state WHERE key = %s", (key,))
        row = cur.fetchone()
        return row[0] if row else None


def set_sync_state(conn, key: str, value: str):
    """Set a value in sync_state table."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO sync_state (key, value, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = NOW()
        """, (key, value))
    conn.commit()


def get_booking_count(conn) -> int:
    """Count bookings synced from Bitrix."""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM bookings WHERE bitrix_deal_id IS NOT NULL")
        return cur.fetchone()[0]
