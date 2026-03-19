"""Configuration: env vars, field mappings, constants."""

import os
from dotenv import load_dotenv

load_dotenv()

BITRIX_WEBHOOK_URL = os.environ.get("BITRIX_WEBHOOK_URL", "").rstrip("/")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Rate limiting: Bitrix24 allows ~2 requests per second
RATE_LIMIT_DELAY = 0.35  # seconds between requests

# Bitrix24 pagination
BATCH_SIZE = 50  # items per request (max 50 for crm.deal.list)

# Pipeline ID for booking deals
BOOKING_PIPELINE_ID = "0"  # Общая

# --- Branch mapping: UF_CRM_1690982742603 enumeration values → our branch_id ---
BRANCH_MAP = {
    "477": 1,   # Сухаревское (Сретенка)
    "471": 2,   # Бауманская
    "764": 3,   # Новослободское
    "473": 4,   # Лубянка
    "475": 5,   # Рублёвское
}

BRANCH_NAMES = {
    1: "Сретенка",
    2: "Бауманская",
    3: "Новослободская",
    4: "Лубянка",
    5: "Рублёвка",
}

# --- Deal stage mapping: Битрикс STAGE_ID → our booking status ---
# NOTE: In Bitrix24, STAGE_ID holds the actual deal stage (not STATUS_ID)
STAGE_MAP = {
    "UC_FXWA71": "new",           # Новый лид
    "UC_2F0INY": "new",           # Взят в работу
    "UC_6PMOFN": "new",           # Лид квалифицирован
    "UC_0ET71K": "new",           # Назначен тест-драйв
    "NEW": "awaiting_payment",    # Зал забронирован (ждем оплату)
    "PREPAYMENT_INVOICE": "fully_paid",  # Зал оплачен (ждем гостя)
    "1": "completed",             # Зал пришёл
    "WON": "completed",           # Успешная сделка
    "LOSE": "cancelled",          # Сделка провалена
}

DEFAULT_STATUS = "new"

# --- Source mapping: Битрикс SOURCE_ID → our booking source ---
SOURCE_MAP = {
    "WEB": "widget",
    "WEBFORM": "widget",
    "CRM_WEBFORM": "widget",
    "PHONE": "phone",
    "CALL": "phone",
    "CALLBACK": "phone",
}

DEFAULT_SOURCE = "admin"

# --- Bitrix24 field names ---
FIELD_BRANCH = "UF_CRM_1690982742603"            # Адрес филиала (enumeration)
FIELD_BOOKING_RESOURCE = "UF_CRM_1691689868925"   # Аренда. Бронирование (resourcebooking)
FIELD_GUEST_COUNT = "UF_CRM_1690127833372"        # Количество гостей (double)
FIELD_VISIT_DATETIME = "UF_CRM_1690209734961"     # Дата и время визита для фильтра
FIELD_END_TIME = "UF_CRM_1682091128591"           # Время окончание
FIELD_STAGE_ID = "STAGE_ID"
FIELD_SOURCE_ID = "SOURCE_ID"
FIELD_CONTACT_ID = "CONTACT_ID"
FIELD_OPPORTUNITY = "OPPORTUNITY"
FIELD_TITLE = "TITLE"
FIELD_DATE_CREATE = "DATE_CREATE"
FIELD_DATE_MODIFY = "DATE_MODIFY"
FIELD_COMMENTS = "COMMENTS"

# Resource section ID → room name (from Bitrix field definition)
# Used for future room_id resolution when calendar API access is granted
RESOURCE_SECTIONS = {
    # Лубянка (branch_id=4)
    "425": "Зал 1. Лубянка Полный газ",
    "427": "Зал 2. Лубянка Флекс",
    "429": "Зал 3. Лубянка Вайб",
    "431": "Зал 4. Лубянка Вайб",
    "433": "Зал 5. Лубянка Вайб",
    "435": "Зал 6. Лубянка Вайб",
    # Сухаревская / Сретенка (branch_id=1)
    "437": "Зал 1. Сухаревская Флекс",
    "439": "Зал 2. Сухаревская Флекс",
    "441": "Зал 3. Сухаревская Полный газ",
    "443": "Зал 4. Сухаревская Вайб",
    "445": "Зал 5. Сухаревская Флекс",
    "447": "Зал 6. Сухаревская Флекс",
    "449": "Зал 7. Сухаревская Полный газ",
    "451": "Зал 8. Сухаревская По-братски",
    "453": "Зал 9. Сухаревская Вайб",
    # Рублёвка (branch_id=5)
    "455": "Зал 1. Рублевка Флекс",
    "457": "Зал 2. Рублевка Вайб",
    "459": "Зал 3. Рублевка Вайб",
    "461": "Зал 4. Рублевка Вайб",
    "463": "Зал 5. Рублевка Полный газ",
    "465": "Зал 6. Рублевка Вайб",
    "467": "Зал 7. Рублевка Вайб",
    "469": "Зал 8. Рублевка Вайб",
    "471": "Зал 9. Рублевка По-братски",
    "473": "Зал 10. Рублевка Флекс",
    "911": "Зал 11. Рублевка По-братски",
    # Бауманская (branch_id=2)
    "475": "Зал 1. Бауманская Вайб",
    "477": "Зал 2. Бауманская Вайб",
    "479": "Зал 3. Бауманская Флекс",
    "481": "Зал 4. Бауманская Флекс",
    "483": "Зал 5. Бауманская Полный газ",
    "485": "Зал 6. Бауманская Вайб",
    "487": "Зал 7. Бауманская Флекс",
    "489": "Зал 8. Бауманская Вайб",
    "491": "Зал 9. Бауманская По-братски",
    "493": "Зал 10. Бауманская Флекс",
    "949": "Зал 11. Бауманская Общий зал",
    "951": "Зал 12. Бауманская Общий зал",
    "953": "Зал 13. Бауманская Общий зал",
    "955": "Зал 99. Бауманская Общий зал",
    # Новослободская (branch_id=3)
    "555": "Зал 1. Новослободская Вайб",
    "557": "Зал 2. Новослободская Вайб",
    "559": "Зал 3. Новослободская Вайб",
    "561": "Зал 4. Новослободская Вайб",
    "563": "Зал 5. Новослободская Вайб",
    "565": "Зал 6. Новослободская Вайб",
    "567": "Зал 7. Новослободская Вайб",
    "569": "Зал 8. Новослободская Вайб",
    "815": "Зал 11. Новослободская Общий зал",
    "853": "Зал 12. Новослободская Общий зал",
    "855": "Зал 13. Новослободская Общий зал",
    "857": "Зал 99. Новослободская Общий зал",
}

# Fields to request from crm.deal.list
DEAL_SELECT_FIELDS = [
    "ID", "TITLE", "CATEGORY_ID", "STAGE_ID", "SOURCE_ID",
    "CONTACT_ID", "ASSIGNED_BY_ID", "OPPORTUNITY", "CURRENCY_ID",
    "DATE_CREATE", "DATE_MODIFY", "COMMENTS",
    FIELD_BRANCH,
    FIELD_BOOKING_RESOURCE,
    FIELD_GUEST_COUNT,
    FIELD_VISIT_DATETIME,
    FIELD_END_TIME,
]
