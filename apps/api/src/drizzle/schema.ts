import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Enums
export const roomCategoryEnum = pgEnum('room_category', [
  'bratski', 'vibe', 'flex', 'full_gas',
]);

export const dayTypeEnum = pgEnum('day_type', [
  'weekday_day', 'weekday_evening', 'friday_day',
  'friday_evening', 'saturday', 'sunday',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'new', 'awaiting_payment', 'partially_paid',
  'fully_paid', 'walkin', 'completed', 'cancelled',
]);

export const bookingTypeEnum = pgEnum('booking_type', ['advance', 'walkin']);

export const bookingSourceEnum = pgEnum('booking_source', [
  'widget', 'admin', 'phone', 'walkin',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'none', 'pending', 'partial', 'paid', 'refunded',
]);

export const userRoleEnum = pgEnum('user_role', [
  'admin', 'rop', 'senior_manager', 'shift_manager',
]);

export const waitlistStatusEnum = pgEnum('waitlist_status', [
  'active', 'notified', 'booked', 'expired',
]);

// Tables
export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  address: text('address').notNull(),
  metro: varchar('metro', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  workingHours: jsonb('working_hours').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  branchId: integer('branch_id').notNull().references(() => branches.id),
  name: varchar('name', { length: 255 }).notNull(),
  number: integer('number').notNull(),
  category: roomCategoryEnum('category').notNull(),
  areaSqm: integer('area_sqm').notNull(),
  capacityStandard: integer('capacity_standard').notNull(),
  capacityMax: integer('capacity_max').notNull(),
  equipment: jsonb('equipment').default({}),
  hasBar: boolean('has_bar').notNull().default(false),
  hasKaraoke: boolean('has_karaoke').notNull().default(true),
  karaokeType: varchar('karaoke_type', { length: 100 }),
  photoUrls: jsonb('photo_urls').default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const priceRules = pgTable('price_rules', {
  id: serial('id').primaryKey(),
  category: roomCategoryEnum('category').notNull(),
  dayType: dayTypeEnum('day_type').notNull(),
  timeFrom: varchar('time_from', { length: 5 }).notNull(),
  timeTo: varchar('time_to', { length: 5 }).notNull(),
  pricePerHour: integer('price_per_hour').notNull(),
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  isSeasonal: boolean('is_seasonal').notNull().default(false),
  seasonCoefficient: numeric('season_coefficient', { precision: 4, scale: 2 }).default('1.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  branchId: integer('branch_id').notNull().references(() => branches.id),
  roomId: integer('room_id').notNull().references(() => rooms.id),
  bookingType: bookingTypeEnum('booking_type').notNull(),
  status: bookingStatusEnum('status').notNull().default('new'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  guestCount: integer('guest_count').notNull(),
  guestName: varchar('guest_name', { length: 255 }).notNull(),
  guestPhone: varchar('guest_phone', { length: 50 }).notNull(),
  guestEmail: varchar('guest_email', { length: 255 }),
  guestComment: text('guest_comment'),
  basePrice: integer('base_price').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
  totalPrice: integer('total_price').notNull().default(0),
  prepaymentAmount: integer('prepayment_amount').notNull().default(0),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('none'),
  paymentId: varchar('payment_id', { length: 255 }),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  source: bookingSourceEnum('source').notNull().default('admin'),
  bitrixDealId: varchar('bitrix_deal_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const waitlist = pgTable('waitlist', {
  id: serial('id').primaryKey(),
  branchId: integer('branch_id').notNull().references(() => branches.id),
  roomCategory: roomCategoryEnum('room_category').notNull(),
  desiredDate: timestamp('desired_date').notNull(),
  desiredTimeFrom: varchar('desired_time_from', { length: 5 }).notNull(),
  desiredTimeTo: varchar('desired_time_to', { length: 5 }).notNull(),
  guestCount: integer('guest_count').notNull(),
  guestName: varchar('guest_name', { length: 255 }).notNull(),
  guestPhone: varchar('guest_phone', { length: 50 }).notNull(),
  status: waitlistStatusEnum('status').notNull().default('active'),
  notifiedAt: timestamp('notified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const discounts = pgTable('discounts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'fixed' | 'percentage' | 'hour_gift' | 'promo_code'
  value: integer('value').notNull(),
  conditions: jsonb('conditions').default({}),
  visibleToGuest: boolean('visible_to_guest').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const promoCodes = pgTable('promo_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  discountId: integer('discount_id').notNull().references(() => discounts.id),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const packages = pgTable('packages', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  includes: jsonb('includes').default({}),
  priceModifier: integer('price_modifier').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('shift_manager'),
  branchId: integer('branch_id').references(() => branches.id),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const slotConfigs = pgTable('slot_configs', {
  id: serial('id').primaryKey(),
  branchId: integer('branch_id').references(() => branches.id),
  category: roomCategoryEnum('category').notNull(),
  dayType: dayTypeEnum('day_type').notNull(),
  timeFrom: varchar('time_from', { length: 5 }).notNull(),
  timeTo: varchar('time_to', { length: 5 }).notNull(),
  minHours: integer('min_hours').notNull().default(2),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id),
  amount: integer('amount').notNull(),
  method: varchar('method', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  yukassaPaymentId: varchar('yukassa_payment_id', { length: 255 }),
  receiptUrl: text('receipt_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id),
  channel: varchar('channel', { length: 50 }).notNull(),
  template: varchar('template', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
