import { Controller, Get, Query, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Controller()
export class StubsController {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  @Get('promo-codes')
  getPromoCodes() {
    return [];
  }

  @Get('promo-codes/active')
  getActivePromos() {
    return [];
  }

  @Get('packages')
  getPackages() {
    return [];
  }

  @Get('waitlist')
  getWaitlist() {
    return { data: [], total: 0 };
  }

  @Get('notifications')
  getNotifications() {
    return [];
  }

  @Get('notifications/stats')
  getNotificationStats() {
    return { total: 0, sent: 0, failed: 0, pending: 0 };
  }

  @Get('empty-slots')
  async getEmptySlots(@Query('date') dateStr?: string) {
    // Default to today + next 7 days
    const startDate = dateStr || new Date().toISOString().split('T')[0];
    const endDate = dateStr
      ? dateStr
      : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const result = await this.db.execute(sql`
      WITH date_range AS (
        SELECT generate_series(
          ${startDate}::date,
          ${endDate}::date,
          '1 day'::interval
        )::date AS d
      ),
      room_hours AS (
        SELECT
          r.id AS room_id,
          r.name AS room_name,
          r.category,
          r.capacity_max,
          r.branch_id,
          br.name AS branch_name,
          dr.d AS slot_date,
          gs.h AS slot_hour
        FROM rooms r
        JOIN branches br ON br.id = r.branch_id
        CROSS JOIN date_range dr
        CROSS JOIN generate_series(10, 23) AS gs(h)
        WHERE r.is_active = true
      ),
      booked_hours AS (
        SELECT
          b.room_id,
          b.start_time::date AS booking_date,
          EXTRACT(HOUR FROM b.start_time)::int AS start_h,
          EXTRACT(HOUR FROM b.end_time)::int AS end_h
        FROM bookings b
        WHERE b.status != 'cancelled'
          AND b.room_id IS NOT NULL
          AND b.start_time::date >= ${startDate}::date
          AND b.start_time::date <= ${endDate}::date
      ),
      free_hours AS (
        SELECT rh.*
        FROM room_hours rh
        WHERE NOT EXISTS (
          SELECT 1 FROM booked_hours bh
          WHERE bh.room_id = rh.room_id
            AND bh.booking_date = rh.slot_date
            AND rh.slot_hour >= bh.start_h
            AND rh.slot_hour < CASE WHEN bh.end_h = 0 THEN 24 ELSE bh.end_h END
        )
      ),
      -- Group consecutive free hours into slots
      grouped AS (
        SELECT
          room_id, room_name, category, capacity_max, branch_id, branch_name, slot_date,
          slot_hour,
          slot_hour - ROW_NUMBER() OVER (PARTITION BY room_id, slot_date ORDER BY slot_hour)::int AS grp
        FROM free_hours
      )
      SELECT
        room_id,
        room_name,
        category,
        branch_name,
        branch_id,
        slot_date::text AS date,
        LPAD(MIN(slot_hour)::text, 2, '0') || ':00' AS time_from,
        LPAD((MAX(slot_hour) + 1)::text, 2, '0') || ':00' AS time_to,
        (MAX(slot_hour) - MIN(slot_hour) + 1) AS hours
      FROM grouped
      GROUP BY room_id, room_name, category, branch_name, branch_id, slot_date, grp
      HAVING MAX(slot_hour) - MIN(slot_hour) + 1 >= 2
      ORDER BY slot_date, branch_name, room_name, MIN(slot_hour)
      LIMIT 200
    `);

    const rows = (result as any).rows || [];

    // Get pricing
    const pricingResult = await this.db.execute(sql`
      SELECT branch_id, room_category, day_type, price_per_hour
      FROM pricing
    `);
    const pricingRows = (pricingResult as any).rows || [];
    const priceMap = new Map<string, number>();
    for (const p of pricingRows) {
      priceMap.set(`${p.branch_id}-${p.room_category}-${p.day_type}`, p.price_per_hour);
    }

    return rows.map((r: any) => {
      const dayOfWeek = new Date(r.date).getDay();
      const dayType = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6 ? 'weekend' : 'weekday';
      const pricePerHour = priceMap.get(`${r.branch_id}-${r.category}-${dayType}`)
        || priceMap.get(`${r.branch_id}-${r.category}-weekday`)
        || 3000;
      const hours = Number(r.hours);
      return {
        roomName: r.room_name,
        roomId: r.room_id,
        category: r.category,
        branchName: r.branch_name,
        branchId: r.branch_id,
        date: r.date,
        timeFrom: r.time_from,
        timeTo: r.time_to,
        pricePerHour,
        totalPrice: pricePerHour * hours,
      };
    });
  }

  @Get('slot-config')
  getSlotConfig() {
    return { slotDuration: 2, gapHours: 0.25, startHour: 10 };
  }
}
