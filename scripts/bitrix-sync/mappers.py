"""Transform Bitrix24 deals into booking rows for PostgreSQL."""

from __future__ import annotations

import logging
from datetime import timedelta
from config import (
    BRANCH_MAP, STAGE_MAP, SOURCE_MAP,
    DEFAULT_STATUS, DEFAULT_SOURCE, BOOKING_PIPELINE_ID,
    FIELD_BRANCH, FIELD_BOOKING_RESOURCE, FIELD_GUEST_COUNT,
    FIELD_VISIT_DATETIME, FIELD_END_TIME,
    FIELD_STAGE_ID, FIELD_SOURCE_ID, FIELD_CONTACT_ID,
    FIELD_OPPORTUNITY, FIELD_DATE_CREATE, FIELD_COMMENTS,
)
from field_parser import parse_contact, parse_bitrix_datetime
from bitrix_client import get_contact_cached

logger = logging.getLogger(__name__)

_skip_contacts = False


def set_skip_contacts(skip: bool):
    """Skip contact API calls for faster bulk sync."""
    global _skip_contacts
    _skip_contacts = skip


def map_deal_to_booking(deal: dict) -> dict | None:
    """Convert a Bitrix24 deal dict to a booking row dict.

    Returns None if the deal cannot be mapped (wrong pipeline, missing branch).
    """
    deal_id = deal.get("ID", "")

    # --- Pipeline filter ---
    category_id = str(deal.get("CATEGORY_ID", ""))
    if category_id != BOOKING_PIPELINE_ID:
        return None

    # --- Branch (from UF_CRM_1690982742603 enumeration field) ---
    branch_raw = deal.get(FIELD_BRANCH)
    branch_id = _resolve_branch(branch_raw)
    if not branch_id:
        logger.debug(f"Deal {deal_id}: unknown branch value={branch_raw}, skipping")
        return None

    # --- Status (from STAGE_ID, not STATUS_ID) ---
    stage_id = deal.get(FIELD_STAGE_ID, "")
    status = STAGE_MAP.get(stage_id, DEFAULT_STATUS)

    # --- Source ---
    source_id = deal.get(FIELD_SOURCE_ID, "") or ""
    source = SOURCE_MAP.get(source_id, DEFAULT_SOURCE)
    # Handle Wazzup sources (start with "WZ")
    if source_id.startswith("WZ"):
        source = "widget"

    # --- Contact ---
    contact_id = deal.get(FIELD_CONTACT_ID)
    contact_data = {"name": "Не указан", "phone": "", "email": ""}
    if contact_id and not _skip_contacts:
        raw_contact = get_contact_cached(str(contact_id))
        contact_data = parse_contact(raw_contact)
    elif contact_id:
        # Use deal title as fallback name during fast sync
        title = deal.get("TITLE", "")
        if title and title != f"Сделка #{deal_id}":
            # If title looks like a phone number, put it in phone field instead
            digits = title.replace("+", "").replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
            if digits.isdigit() and len(digits) >= 10:
                contact_data["phone"] = title
            else:
                contact_data["name"] = title

    # --- Times (from UF_CRM_1690209734961 visit datetime) ---
    start_time = parse_bitrix_datetime(deal.get(FIELD_VISIT_DATETIME))
    end_time = parse_bitrix_datetime(deal.get(FIELD_END_TIME))

    # Fallback: use deal creation date
    if not start_time:
        start_time = parse_bitrix_datetime(deal.get(FIELD_DATE_CREATE))
    if not end_time and start_time:
        end_time = start_time + timedelta(hours=2)

    # --- Guest count ---
    guest_count = _parse_guest_count(deal.get(FIELD_GUEST_COUNT))

    # --- Price (from OPPORTUNITY field) ---
    # NOTE: crm.order.list requires separate scope not available in webhook
    total_price = _parse_price(deal.get(FIELD_OPPORTUNITY))
    prepayment = 0

    payment_status = "none"
    if prepayment and prepayment >= total_price and total_price > 0:
        payment_status = "paid"
    elif prepayment and prepayment > 0:
        payment_status = "partial"

    # --- Resource booking IDs (store for future room resolution) ---
    resource_ids = _extract_resource_ids(deal.get(FIELD_BOOKING_RESOURCE))

    # --- Build booking row ---
    booking = {
        "bitrix_deal_id": str(deal_id),
        "branch_id": branch_id,
        "room_id": None,  # TODO: resolve via calendar API when access is granted
        "booking_type": "advance",
        "status": status,
        "start_time": start_time.isoformat() if start_time else None,
        "end_time": end_time.isoformat() if end_time else None,
        "guest_count": guest_count,
        "guest_name": contact_data["name"],
        "guest_phone": contact_data["phone"] or "Не указан",
        "guest_email": contact_data["email"] or None,
        "guest_comment": deal.get(FIELD_COMMENTS) or None,
        "base_price": total_price,
        "discount_amount": 0,
        "total_price": total_price,
        "prepayment_amount": prepayment or 0,
        "payment_status": payment_status,
        "source": source,
        "created_at": deal.get(FIELD_DATE_CREATE),
        "updated_at": deal.get("DATE_MODIFY"),
        "_resource_ids": resource_ids,  # internal, not written to DB
    }

    return booking


def _resolve_branch(value) -> int | None:
    """Resolve branch_id from UF_CRM_1690982742603 enumeration field."""
    if not value:
        return None
    if isinstance(value, list):
        value = value[0] if value else None
    if not value:
        return None
    return BRANCH_MAP.get(str(value))


def _extract_resource_ids(value) -> list[str]:
    """Extract resource booking IDs from the field value.

    Value can be: list of ints/strings, False, None, or empty list.
    """
    if not value or value is False:
        return []
    if isinstance(value, list):
        return [str(v) for v in value if v]
    return [str(value)]


def _parse_guest_count(value) -> int:
    """Parse guest count field. Default to 1 if not set."""
    if not value:
        return 1
    try:
        count = int(float(str(value)))
        return max(count, 1)
    except (ValueError, TypeError):
        return 1


def _parse_price(value) -> int:
    """Parse OPPORTUNITY field to integer price in rubles."""
    if not value:
        return 0
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        return 0


