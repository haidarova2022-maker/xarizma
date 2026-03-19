import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getStats(branchId?: number) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Previous year same period (same number of days for fair LFL comparison)
    const prevMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const prevMonthEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59);

    const bf = branchId ? sql`AND branch_id = ${branchId}` : sql``;

    // Current month
    const monthRes = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS bookings,
        COALESCE(SUM(guest_count), 0)::int AS guests,
        COALESCE(SUM(total_price), 0)::bigint AS revenue,
        CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total_price)::numeric / COUNT(*))::int ELSE 0 END AS avg_check,
        COUNT(*) FILTER (WHERE status IN ('new', 'awaiting_payment'))::int AS leads,
        COUNT(*) FILTER (WHERE status IN ('fully_paid', 'completed'))::int AS conversions
      FROM bookings
      WHERE start_time >= ${monthStart.toISOString()} AND start_time <= ${now.toISOString()}
        AND status != 'cancelled' ${bf}
    `);

    // Today
    const todayRes = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS bookings,
        COALESCE(SUM(guest_count), 0)::int AS guests,
        COUNT(*) FILTER (WHERE status IN ('new', 'awaiting_payment'))::int AS leads
      FROM bookings
      WHERE start_time >= ${todayStart.toISOString()} AND start_time <= ${todayEnd.toISOString()}
        AND status != 'cancelled' ${bf}
    `);

    // Previous year same month
    const prevRes = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS bookings,
        COALESCE(SUM(guest_count), 0)::int AS guests,
        COALESCE(SUM(total_price), 0)::bigint AS revenue,
        CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total_price)::numeric / COUNT(*))::int ELSE 0 END AS avg_check,
        COUNT(*) FILTER (WHERE status IN ('new', 'awaiting_payment'))::int AS leads,
        COUNT(*) FILTER (WHERE status IN ('fully_paid', 'completed'))::int AS conversions
      FROM bookings
      WHERE start_time >= ${prevMonthStart.toISOString()} AND start_time <= ${prevMonthEnd.toISOString()}
        AND status != 'cancelled' ${bf}
    `);

    const m = (monthRes as any).rows[0];
    const t = (todayRes as any).rows[0];
    const p = (prevRes as any).rows[0];

    const lfl = (cur: number, prev: number) =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;

    const convRate = (leads: number, conv: number) =>
      leads + conv > 0 ? Math.round((conv / (leads + conv)) * 1000) / 10 : 0;

    // Revenue plan = last year * 1.2 (20% growth target)
    const revenuePlan = Math.round(Number(p.revenue) * 1.2);
    const avgCheckPlan = Math.round(p.avg_check * 1.15);

    return {
      bookingsMonth: m.bookings,
      bookingsToday: t.bookings,
      guestsMonth: m.guests,
      guestsToday: t.guests,
      bookingsLfl: lfl(m.bookings, p.bookings),
      guestsLfl: lfl(m.guests, p.guests),
      bookingsLastYear: p.bookings,
      guestsLastYear: p.guests,
      revenueMonth: Number(m.revenue),
      revenueLastYear: Number(p.revenue),
      revenueLfl: lfl(Number(m.revenue), Number(p.revenue)),
      revenuePlan,
      avgCheck: m.avg_check,
      avgCheckLastYear: p.avg_check,
      avgCheckLfl: lfl(m.avg_check, p.avg_check),
      avgCheckPlan,
      leadsMonth: m.leads,
      leadsToday: t.leads,
      leadsLastYear: p.leads,
      leadsLfl: lfl(m.leads, p.leads),
      conversionRate: convRate(m.leads, m.conversions),
      conversionLastYear: convRate(p.leads, p.conversions),
    };
  }
}
