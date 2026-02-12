export enum RoomCategory {
  BRATSKI = 'bratski',
  VIBE = 'vibe',
  FLEX = 'flex',
  FULL_GAS = 'full_gas',
}

export enum DayType {
  WEEKDAY_DAY = 'weekday_day',
  WEEKDAY_EVENING = 'weekday_evening',
  FRIDAY_DAY = 'friday_day',
  FRIDAY_EVENING = 'friday_evening',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum BookingStatus {
  NEW = 'new',
  AWAITING_PAYMENT = 'awaiting_payment',
  PARTIALLY_PAID = 'partially_paid',
  FULLY_PAID = 'fully_paid',
  WALKIN = 'walkin',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum BookingType {
  ADVANCE = 'advance',
  WALKIN = 'walkin',
}

export enum BookingSource {
  WIDGET = 'widget',
  ADMIN = 'admin',
  PHONE = 'phone',
  WALKIN = 'walkin',
}

export enum PaymentStatus {
  NONE = 'none',
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export enum UserRole {
  ADMIN = 'admin',
  ROP = 'rop',
  SENIOR_MANAGER = 'senior_manager',
  SHIFT_MANAGER = 'shift_manager',
}

export enum WaitlistStatus {
  ACTIVE = 'active',
  NOTIFIED = 'notified',
  BOOKED = 'booked',
  EXPIRED = 'expired',
}

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  [BookingStatus.NEW]: '#FFE082',
  [BookingStatus.AWAITING_PAYMENT]: '#FFCC80',
  [BookingStatus.PARTIALLY_PAID]: '#A5D6A7',
  [BookingStatus.FULLY_PAID]: '#4CAF50',
  [BookingStatus.WALKIN]: '#CE93D8',
  [BookingStatus.COMPLETED]: '#81C784',
  [BookingStatus.CANCELLED]: '#EF9A9A',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.NEW]: 'Новая заявка',
  [BookingStatus.AWAITING_PAYMENT]: 'Ожидает оплаты',
  [BookingStatus.PARTIALLY_PAID]: 'Частичная оплата',
  [BookingStatus.FULLY_PAID]: 'Оплачена',
  [BookingStatus.WALKIN]: 'Ситуативная',
  [BookingStatus.COMPLETED]: 'Реализована',
  [BookingStatus.CANCELLED]: 'Отменена',
};

export const ROOM_CATEGORY_LABELS: Record<RoomCategory, string> = {
  [RoomCategory.BRATSKI]: 'По-братски',
  [RoomCategory.VIBE]: 'Вайб',
  [RoomCategory.FLEX]: 'Флекс',
  [RoomCategory.FULL_GAS]: 'Полный газ',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.ROP]: 'РОП',
  [UserRole.SENIOR_MANAGER]: 'Старший менеджер',
  [UserRole.SHIFT_MANAGER]: 'Менеджер смены',
};

export const BUFFER_MINUTES = 15;
export const HOLD_MINUTES = 10;
export const MIN_BOOKING_HOURS = 2;
