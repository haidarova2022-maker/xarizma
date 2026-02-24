import type { Dayjs } from 'dayjs';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface DaySchedule {
  open: string;
  close: string;
  is24h: boolean;
}

type WorkingHours = Record<string, DaySchedule | null>;

/**
 * Checks if a specific hour on a given day falls within the branch's working hours.
 *
 * Handles:
 * - is24h schedules (open all day)
 * - Schedules spanning midnight (e.g. 14:00-06:00)
 * - Previous day carryover (late-night shifts extending into early morning)
 * - Closed days (null) with possible carryover from previous day
 *
 * Convention: is24h previous day carries over until 06:00 next day
 * (matches "Пн выходной с 6.00" business rule)
 */
export function isHourOpen(
  workingHours: WorkingHours | undefined,
  cellDay: Dayjs,
  realHour: number,
): boolean {
  if (!workingHours) return true;

  const dow = cellDay.day();
  const dayName = DAY_NAMES[dow];
  const schedule = workingHours[dayName];

  // 1. Check current day's own schedule
  if (schedule) {
    if (schedule.is24h) {
      const openH = parseInt(schedule.open.split(':')[0], 10);
      if (openH === 0) return true; // Full 24h day
      // Partial 24h (e.g. Friday opens at 14:00 then runs continuously)
      if (realHour >= openH) return true;
      // Early hours — fall through to previous-day carryover check
    } else {
      const openH = parseInt(schedule.open.split(':')[0], 10);
      const closeH = parseInt(schedule.close.split(':')[0], 10);

      if (closeH <= openH) {
        // Spans midnight (e.g. 14:00-06:00)
        if (realHour >= openH) return true;
        // Early hours — fall through to previous-day carryover check
      } else {
        // Same day range
        if (realHour >= openH && realHour < closeH) return true;
      }
    }
  }

  // 2. Check if previous day's schedule carries over into early hours of this day
  const prevDow = (dow + 6) % 7;
  const prevDayName = DAY_NAMES[prevDow];
  const prevSchedule = workingHours[prevDayName];

  if (prevSchedule) {
    if (prevSchedule.is24h) {
      // 24h previous day carries over until 06:00
      if (realHour < 6) return true;
    } else {
      const prevOpenH = parseInt(prevSchedule.open.split(':')[0], 10);
      const prevCloseH = parseInt(prevSchedule.close.split(':')[0], 10);

      if (prevCloseH <= prevOpenH) {
        // Previous day spans midnight — carries over until closeH
        if (realHour < prevCloseH) return true;
      }
    }
  }

  return false;
}

/**
 * Checks if all hours in a range are closed for a given day.
 * Used to detect full day-off to show "Выходной" banner.
 */
export function isDayFullyClosed(
  workingHours: WorkingHours | undefined,
  day: Dayjs,
  fromHour: number,
  toHour: number,
): boolean {
  if (!workingHours) return false;
  for (let h = fromHour; h <= toHour; h++) {
    if (isHourOpen(workingHours, day, h)) return false;
  }
  return true;
}
