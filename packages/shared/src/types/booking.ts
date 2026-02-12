import { BookingStatus, BookingType, BookingSource, PaymentStatus } from '../constants/enums';

export interface Booking {
  id: number;
  branchId: number;
  roomId: number;
  bookingType: BookingType;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  guestCount: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  guestComment: string | null;
  basePrice: number;
  discountAmount: number;
  totalPrice: number;
  prepaymentAmount: number;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  createdByUserId: number | null;
  source: BookingSource;
  bitrixDealId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  branchId: number;
  roomId: number;
  bookingType: BookingType;
  startTime: string;
  endTime: string;
  guestCount: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestComment?: string;
  source: BookingSource;
  promoCode?: string;
  packageId?: number;
}

export interface UpdateBookingDto {
  status?: BookingStatus;
  startTime?: string;
  endTime?: string;
  guestCount?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  guestComment?: string;
}

export interface BookingCalendarItem {
  id: number;
  roomId: number;
  roomName: string;
  roomNumber: number;
  branchId: number;
  status: BookingStatus;
  bookingType: BookingType;
  startTime: string;
  endTime: string;
  guestName: string;
  guestCount: number;
  totalPrice: number;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  roomId: number;
  roomName: string;
  roomCategory: string;
  pricePerHour: number;
}

export interface PriceCalculation {
  basePrice: number;
  discountAmount: number;
  totalPrice: number;
  pricePerHour: number;
  hours: number;
  breakdown: PriceBreakdownItem[];
}

export interface PriceBreakdownItem {
  timeFrom: string;
  timeTo: string;
  hours: number;
  pricePerHour: number;
  subtotal: number;
}
