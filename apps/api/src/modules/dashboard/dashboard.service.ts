import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getStats(branchId?: number, period: string = 'month') {
    const now = new Date();
    let dateFrom: Date;
    let prevDateFrom: Date;
    let prevDateTo: Date;

    if (period === 'week') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      prevDateFrom = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() - 7);
      prevDateTo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else {
      // month
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      prevDateFrom = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      prevDateTo = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
    }

    const branchFilter = branchId ? sql`AND branch_id = ${branchId}` : sql``;

    // Current period stats
    const currentResult = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total_bookings,
        COALESCE(SUM(guest_count), 0)::int AS total_guests,
        COALESCE(SUM(total_price), 0)::bigint AS total_revenue,
        CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total_price)::numeric / COUNT(*))::int ELSE 0 END AS avg_check,
        COUNT(*) FILTER (WHERE status IN ('new', 'awaiting_payment'))::int AS leads,
        COUNT(*) FILTER (WHERE status IN ('fully_paid', 'completed'))::int AS conversions,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancellations
      FROM bookings
      WHERE start_time >= ${dateFrom.toISOString()}
        AND start_time <= ${now.toISOString()}
        ${branchFilter}
    `);

    // Previous period (LFL)
    const prevResult = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total_bookings,
        COALESCE(SUM(total_price), 0)::bigint AS total_revenue
      FROM bookings
      WHERE start_time >= ${prevDateFrom.toISOString()}
        AND start_time <= ${prevDateTo.toISOString()}
        ${branchFilter}
    `);

    const row = (currentResult as any).rows[0];
    const prevRow = (prevResult as any).rows[0];

    const bookingsLfl = prevRow.total_bookings > 0
      ? Math.round(((row.total_bookings - prevRow.total_bookings) / prevRow.total_bookings) * 100)
      : 0;
    const revenueLfl = prevRow.total_revenue > 0
      ? Math.round(((Number(row.total_revenue) - Number(prevRow.total_revenue)) / Number(prevRow.total_revenue)) * 100)
      : 0;

    const conversionRate = row.leads + row.conversions > 0
      ? Math.round((row.conversions / (row.leads + row.conversions)) * 1000) / 10
      : 0;

    return {
      totalBookings: row.total_bookings,
      totalGuests: row.total_guests,
      totalRevenue: Number(row.total_revenue),
      avgCheck: row.avg_check,
      leads: row.leads,
      conversions: row.conversions,
      cancellations: row.cancellations,
      conversionRate,
      lfl: {
        bookings: bookingsLfl,
        revenue: revenueLfl,
      },
    };
  }
}
