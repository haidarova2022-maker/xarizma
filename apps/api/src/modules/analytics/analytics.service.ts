import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getSourceAnalytics(branchId?: number) {
    const branchFilter = branchId ? sql`AND b.branch_id = ${branchId}` : sql``;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const prevMonthEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);

    // Current period by source
    const currentResult = await this.db.execute(sql`
      SELECT
        source,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(total_price), 0)::bigint AS revenue,
        CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total_price)::numeric / COUNT(*))::int ELSE 0 END AS avg_check
      FROM bookings b
      WHERE b.start_time >= ${monthStart.toISOString()}
        ${branchFilter}
      GROUP BY source
      ORDER BY bookings DESC
    `);

    // Previous year same period by source
    const prevResult = await this.db.execute(sql`
      SELECT
        source,
        COUNT(*)::int AS bookings
      FROM bookings b
      WHERE b.start_time >= ${prevMonthStart.toISOString()}
        AND b.start_time <= ${prevMonthEnd.toISOString()}
        ${branchFilter}
      GROUP BY source
    `);

    const currentRows = (currentResult as any).rows as any[];
    const prevRows = (prevResult as any).rows as any[];
    const prevMap = new Map(prevRows.map((r: any) => [r.source, r.bookings]));

    return currentRows.map((row: any) => {
      const lastYear = prevMap.get(row.source) || 0;
      const lfl = lastYear > 0 ? Math.round(((row.bookings - lastYear) / lastYear) * 100) : 0;
      return {
        source: row.source,
        bookings: row.bookings,
        revenue: Number(row.revenue),
        avgCheck: row.avg_check,
        lfl,
        lastYearBookings: lastYear,
      };
    });
  }

  async getRoomAnalytics(branchId?: number) {
    const branchFilter = branchId ? sql`AND b.branch_id = ${branchId}` : sql``;

    const result = await this.db.execute(sql`
      SELECT
        r.id AS room_id,
        r.name AS room_name,
        r.category,
        br.name AS branch_name,
        COUNT(b.id)::int AS bookings,
        COALESCE(SUM(b.total_price), 0)::bigint AS revenue,
        COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600), 0)::numeric AS booked_hours
      FROM rooms r
      LEFT JOIN bookings b ON b.room_id = r.id
        AND b.start_time >= ${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()}
        AND b.status != 'cancelled'
        ${branchFilter}
      LEFT JOIN branches br ON br.id = r.branch_id
      GROUP BY r.id, r.name, r.category, br.name
      ORDER BY bookings DESC
    `);

    const rows = (result as any).rows as any[];
    return rows.map((r: any) => ({
      roomId: r.room_id,
      roomName: r.room_name,
      category: r.category,
      branchName: r.branch_name,
      bookings: r.bookings,
      revenue: Number(r.revenue),
      bookedHours: Math.round(Number(r.booked_hours)),
    }));
  }

  async getCancellationAnalytics(branchId?: number) {
    const branchFilter = branchId ? sql`AND branch_id = ${branchId}` : sql``;

    const result = await this.db.execute(sql`
      SELECT
        TO_CHAR(start_time, 'YYYY-MM') AS month,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM bookings
      WHERE start_time >= NOW() - INTERVAL '12 months'
        ${branchFilter}
      GROUP BY TO_CHAR(start_time, 'YYYY-MM')
      ORDER BY month
    `);

    const rows = (result as any).rows as any[];
    return rows.map((r: any) => ({
      month: r.month,
      total: r.total,
      cancelled: r.cancelled,
      rate: r.total > 0 ? Math.round((r.cancelled / r.total) * 1000) / 10 : 0,
    }));
  }

  async getManagerAnalytics(_branchId?: number) {
    // Stub — no manager data in Bitrix sync
    return [];
  }
}
