"""HTTP client for Bitrix24 REST API with rate limiting and pagination."""

from __future__ import annotations

import time
import logging
import requests
from config import BITRIX_WEBHOOK_URL, RATE_LIMIT_DELAY, BATCH_SIZE

logger = logging.getLogger(__name__)

_last_request_time = 0.0


def _rate_limit():
    """Enforce rate limiting between requests."""
    global _last_request_time
    now = time.time()
    elapsed = now - _last_request_time
    if elapsed < RATE_LIMIT_DELAY:
        time.sleep(RATE_LIMIT_DELAY - elapsed)
    _last_request_time = time.time()


MAX_RETRIES = 3
RETRY_DELAYS = [5, 15, 30]  # seconds between retries


def call_method(method: str, params: dict | None = None) -> dict:
    """Call a single Bitrix24 REST method with retry on timeout/network errors.

    Args:
        method: API method name (e.g. 'crm.deal.list')
        params: Query parameters

    Returns:
        Full JSON response dict

    Raises:
        requests.HTTPError: On HTTP errors after all retries
        ValueError: On API-level errors
    """
    if not BITRIX_WEBHOOK_URL:
        raise ValueError("BITRIX_WEBHOOK_URL is not set")

    url = f"{BITRIX_WEBHOOK_URL}/{method}"

    for attempt in range(MAX_RETRIES + 1):
        _rate_limit()
        try:
            resp = requests.post(url, json=params or {}, timeout=30)
            resp.raise_for_status()

            data = resp.json()
            if "error" in data:
                raise ValueError(f"Bitrix API error: {data['error']} — {data.get('error_description', '')}")

            return data
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            if attempt < MAX_RETRIES:
                delay = RETRY_DELAYS[attempt]
                logger.warning(f"Request to {method} failed (attempt {attempt+1}/{MAX_RETRIES+1}): {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                logger.error(f"Request to {method} failed after {MAX_RETRIES+1} attempts: {e}")
                raise


def fetch_deals(
    category_id: str | None = None,
    modified_since: str | None = None,
    select: list[str] | None = None,
    limit: int | None = None,
) -> list[dict]:
    """Fetch deals with pagination. Returns all deals as a list."""
    return list(iter_deals(category_id, modified_since, select, limit))


def iter_deals(
    category_id: str | None = None,
    modified_since: str | None = None,
    select: list[str] | None = None,
    limit: int | None = None,
    page_size: int = 50,
):
    """Yield deals page by page (generator). Memory-efficient for large datasets."""
    params: dict = {
        "order": {"DATE_MODIFY": "ASC"},
        "start": 0,
    }
    if select:
        params["select"] = select
    if category_id:
        params["filter"] = {"CATEGORY_ID": category_id}
    else:
        params["filter"] = {}

    if modified_since:
        params["filter"][">DATE_MODIFY"] = modified_since

    total = 0
    while True:
        data = call_method("crm.deal.list", params)
        result = data.get("result", [])

        if not result:
            break

        for deal in result:
            yield deal
            total += 1
            if limit and total >= limit:
                return

        if total % 500 == 0 or total < 100:
            logger.info(f"Fetched {total} deals so far...")

        next_start = data.get("next")
        if next_start is None:
            break
        params["start"] = next_start

    logger.info(f"Fetched {total} deals total")


def get_contact(contact_id: str) -> dict | None:
    """Fetch a single contact by ID.

    Returns:
        Contact dict or None if not found
    """
    if not contact_id:
        return None

    try:
        data = call_method("crm.contact.get", {"ID": contact_id})
        return data.get("result")
    except (ValueError, requests.HTTPError) as e:
        logger.warning(f"Failed to fetch contact {contact_id}: {e}")
        return None


def fetch_orders_for_deal(deal_id: str) -> list[dict]:
    """Fetch orders linked to a deal.

    Returns:
        List of order dicts
    """
    try:
        data = call_method("crm.order.list", {
            "filter": {"UF_DEAL_ID": deal_id},
            "select": ["ID", "PAYED", "PRICE", "CURRENCY", "STATUS_ID"],
        })
        return data.get("result", {}).get("orders", [])
    except (ValueError, requests.HTTPError) as e:
        logger.warning(f"Failed to fetch orders for deal {deal_id}: {e}")
        return []


# --- Contact cache (in-memory per run) ---
_contact_cache: dict[str, dict | None] = {}


def get_contact_cached(contact_id: str) -> dict | None:
    """Get contact with in-memory cache."""
    if contact_id in _contact_cache:
        return _contact_cache[contact_id]
    contact = get_contact(contact_id)
    _contact_cache[contact_id] = contact
    return contact
