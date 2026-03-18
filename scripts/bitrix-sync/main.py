#!/usr/bin/env python3
"""
Bitrix24 → PostgreSQL sync for Xarizma karaoke bookings.

Usage:
    python main.py --discover          # Inspect raw Bitrix fields (no DB writes)
    python main.py --dry-run --limit 10 # Test mapping without writing
    python main.py --full              # Full sync (all deals)
    python main.py                     # Incremental sync (default, for cron)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys

from config import (
    BITRIX_WEBHOOK_URL, DATABASE_URL,
    DEAL_SELECT_FIELDS, BRANCH_MAP, BRANCH_NAMES,
    FIELD_BRANCH, FIELD_BOOKING_RESOURCE, FIELD_GUEST_COUNT,
)
from bitrix_client import fetch_deals, call_method
from sync import run_full_sync, run_incremental_sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("bitrix-sync")


def cmd_discover(limit: int = 20):
    """Discover mode: fetch sample deals and print raw field values.

    Useful for understanding Bitrix field formats before writing parsers.
    """
    logger.info("=== DISCOVER MODE ===")
    logger.info(f"Webhook URL: {BITRIX_WEBHOOK_URL[:40]}...")

    # 1. Fetch deal fields schema
    logger.info("\n--- Deal fields schema ---")
    try:
        fields_data = call_method("crm.deal.fields")
        fields = fields_data.get("result", {})
        # Show custom fields (UF_*)
        custom_fields = {k: v for k, v in fields.items() if k.startswith("UF_")}
        logger.info(f"Custom fields ({len(custom_fields)}):")
        for name, info in custom_fields.items():
            logger.info(f"  {name}: type={info.get('type')}, title={info.get('formLabel', info.get('title', '?'))}")
    except Exception as e:
        logger.error(f"Failed to fetch deal fields: {e}")

    # 2. Fetch sample deals (no category filter — branch is in UF field)
    all_resource_values = []
    logger.info(f"\n--- Fetching {limit} sample deals ---")

    deals = fetch_deals(
        select=DEAL_SELECT_FIELDS,
        limit=limit,
    )
    logger.info(f"Fetched {len(deals)} deals total")

    for deal in deals[:20]:  # Show first 20 in detail
        deal_id = deal.get("ID")
        title = deal.get("TITLE", "")
        status = deal.get("STATUS_ID", "")
        source = deal.get("SOURCE_ID", "")
        opportunity = deal.get("OPPORTUNITY", "")
        branch_val = deal.get(FIELD_BRANCH)
        resource = deal.get(FIELD_BOOKING_RESOURCE)
        guest_count = deal.get(FIELD_GUEST_COUNT)
        contact_id = deal.get("CONTACT_ID")

        branch_id = BRANCH_MAP.get(str(branch_val) if branch_val else "", None)
        branch_name = BRANCH_NAMES.get(branch_id, "?") if branch_id else f"unmapped({branch_val})"

        logger.info(
            f"  Deal #{deal_id}: '{title}' | branch={branch_name} | status={status} "
            f"| source={source} | price={opportunity} | guests={guest_count} | contact={contact_id}"
        )
        if resource:
            logger.info(f"    Resource field: {json.dumps(resource, ensure_ascii=False, default=str)}")
            all_resource_values.append(resource)

        # Print all UF_ fields
        uf_fields = {k: v for k, v in deal.items() if k.startswith("UF_") and v}
        if uf_fields:
            logger.info(f"    UF fields: {json.dumps(uf_fields, ensure_ascii=False, default=str)}")

    # 3. Summary of resource field formats
    if all_resource_values:
        logger.info(f"\n--- Resource field summary ({len(all_resource_values)} non-empty values) ---")
        types = set()
        for v in all_resource_values:
            types.add(type(v).__name__)
        logger.info(f"  Value types: {types}")
        logger.info(f"  First value: {json.dumps(all_resource_values[0], ensure_ascii=False, default=str)}")
    else:
        logger.info("\n--- No resource field values found ---")

    # 4. Check category (pipeline) names
    logger.info("\n--- Pipelines ---")
    try:
        categories = call_method("crm.category.list", {"entityTypeId": 2})
        for cat in categories.get("result", {}).get("categories", []):
            logger.info(f"  ID={cat.get('id')}: {cat.get('name')}")
    except Exception as e:
        logger.warning(f"Could not fetch categories: {e}")

    logger.info("\n=== DISCOVER DONE ===")


def main():
    parser = argparse.ArgumentParser(description="Bitrix24 → PostgreSQL sync")
    parser.add_argument("--discover", action="store_true", help="Inspect raw Bitrix fields")
    parser.add_argument("--full", action="store_true", help="Full sync (all deals)")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB")
    parser.add_argument("--limit", type=int, default=None, help="Max deals per branch")
    parser.add_argument("--fast", action="store_true", help="Skip contact API calls for speed")
    parser.add_argument("--verbose", "-v", action="store_true", help="Debug logging")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.fast:
        from mappers import set_skip_contacts
        set_skip_contacts(True)
        logger.info("Fast mode: skipping contact API calls")

    # Validate config
    if not BITRIX_WEBHOOK_URL:
        logger.error("BITRIX_WEBHOOK_URL is not set. Check .env or environment variables.")
        sys.exit(1)

    if args.discover:
        cmd_discover(limit=args.limit or 20)
        return

    if not args.dry_run and not DATABASE_URL:
        logger.error("DATABASE_URL is not set. Check .env or environment variables.")
        sys.exit(1)

    if args.full:
        counts = run_full_sync(dry_run=args.dry_run, limit=args.limit)
    else:
        counts = run_incremental_sync(dry_run=args.dry_run, limit=args.limit)

    # Exit code: 0 if no errors, 1 if any errors
    if counts.get("errors", 0) > 0:
        logger.warning(f"Completed with {counts['errors']} errors")
        sys.exit(1)


if __name__ == "__main__":
    main()
