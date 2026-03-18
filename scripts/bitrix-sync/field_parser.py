"""Parse Bitrix24 custom fields: booking resources, contacts, dates."""

from __future__ import annotations

import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def parse_booking_resource(value) -> dict:
    """Parse the 'Бронирование ресурсов' (UF_CRM_1691689868925) field.

    The exact format is unknown — this parser handles several possible formats:
    1. JSON string / list of dicts with date/time/resource info
    2. Plain text like "Зал 5 / 14:00-16:00 / 2024-01-15"
    3. Structured Bitrix resource booking format

    Returns dict with keys: room_name, start_time, end_time, date, raw
    All keys may be None if parsing fails.
    """
    result = {
        "room_name": None,
        "start_time": None,
        "end_time": None,
        "date": None,
        "duration_hours": None,
        "raw": value,
    }

    if not value:
        return result

    # If it's a list (Bitrix resource booking format)
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                result["room_name"] = item.get("RESOURCE_NAME") or item.get("name")
                date_from = item.get("DATE_FROM") or item.get("dateFrom")
                date_to = item.get("DATE_TO") or item.get("dateTo")
                if date_from:
                    result["start_time"] = date_from
                    result["date"] = date_from[:10] if len(date_from) >= 10 else None
                if date_to:
                    result["end_time"] = date_to
                # Calculate duration
                if date_from and date_to:
                    result["duration_hours"] = _calc_duration(date_from, date_to)
        return result

    # If it's a dict
    if isinstance(value, dict):
        result["room_name"] = value.get("RESOURCE_NAME") or value.get("name")
        date_from = value.get("DATE_FROM") or value.get("dateFrom")
        date_to = value.get("DATE_TO") or value.get("dateTo")
        if date_from:
            result["start_time"] = date_from
            result["date"] = date_from[:10] if len(date_from) >= 10 else None
        if date_to:
            result["end_time"] = date_to
        if date_from and date_to:
            result["duration_hours"] = _calc_duration(date_from, date_to)
        return result

    # If it's a string — try to extract info
    text = str(value)

    # Try to find room name (Зал N, Комната N, etc.)
    room_match = re.search(r"(?:Зал|Комната|Room)\s*[#№]?\s*(\d+)", text, re.IGNORECASE)
    if room_match:
        result["room_name"] = room_match.group(0)

    # Try to find date (YYYY-MM-DD or DD.MM.YYYY)
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    if date_match:
        result["date"] = date_match.group(1)
    else:
        date_match = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", text)
        if date_match:
            result["date"] = f"{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}"

    # Try to find time range (HH:MM-HH:MM or HH:MM — HH:MM)
    time_match = re.search(r"(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})", text)
    if time_match:
        result["start_time"] = time_match.group(1)
        result["end_time"] = time_match.group(2)

    return result


def parse_contact(contact: dict | None) -> dict:
    """Extract name, phone, email from a Bitrix contact.

    Returns dict with keys: name, phone, email
    """
    if not contact:
        return {"name": "Не указан", "phone": "", "email": ""}

    name_parts = [
        contact.get("LAST_NAME", ""),
        contact.get("NAME", ""),
        contact.get("SECOND_NAME", ""),
    ]
    name = " ".join(p for p in name_parts if p).strip() or "Не указан"

    phone = ""
    phones = contact.get("PHONE", [])
    if phones and isinstance(phones, list):
        phone = phones[0].get("VALUE", "") if phones else ""

    email = ""
    emails = contact.get("EMAIL", [])
    if emails and isinstance(emails, list):
        email = emails[0].get("VALUE", "") if emails else ""

    return {"name": name, "phone": phone, "email": email}


def parse_bitrix_datetime(value: str | None) -> datetime | None:
    """Parse Bitrix24 datetime string to Python datetime.

    Bitrix formats: '2024-01-15T14:30:00+03:00' or '2024-01-15 14:30:00'
    """
    if not value:
        return None

    for fmt in [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    logger.warning(f"Could not parse datetime: {value}")
    return None


def _calc_duration(start: str, end: str) -> float | None:
    """Calculate duration in hours between two datetime strings."""
    dt_start = parse_bitrix_datetime(start)
    dt_end = parse_bitrix_datetime(end)
    if dt_start and dt_end:
        delta = dt_end - dt_start
        return round(delta.total_seconds() / 3600, 1)
    return None


def extract_room_identifier(room_name: str | None) -> str | None:
    """Extract a normalized room identifier from a resource name.

    Used for mapping Bitrix resource names to our room_id.
    Returns a string like 'bratski_1', 'vibe_3', etc. or None.
    """
    if not room_name:
        return None

    text = room_name.lower()

    # Try to extract number
    num_match = re.search(r"(\d+)", text)
    room_num = int(num_match.group(1)) if num_match else None

    # Detect category from name
    category = None
    if any(kw in text for kw in ["бро", "bro", "bratski"]):
        category = "bratski"
    elif any(kw in text for kw in ["вайб", "vibe"]):
        category = "vibe"
    elif any(kw in text for kw in ["флекс", "flex"]):
        category = "flex"
    elif any(kw in text for kw in ["полный газ", "full_gas", "full gas"]):
        category = "full_gas"

    if category and room_num:
        return f"{category}_{room_num}"

    return room_name  # fallback: return raw name for manual mapping
