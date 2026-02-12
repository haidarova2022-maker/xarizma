import { DayType } from '../constants/enums';

export function getDayType(date: Date): DayType {
  const day = date.getDay();
  const hour = date.getHours();

  if (day === 0) return DayType.SUNDAY;
  if (day === 6) return DayType.SATURDAY;
  if (day === 5) {
    return hour < 17 ? DayType.FRIDAY_DAY : DayType.FRIDAY_EVENING;
  }
  // Mon-Thu
  return hour < 17 ? DayType.WEEKDAY_DAY : DayType.WEEKDAY_EVENING;
}

export function calculateHours(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return phone;
}
