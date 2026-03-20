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
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const branchFilter = branchId ? sql`AND b.branch_id = ${branchId}` : sql``;

    // Check if any bookings have room assignments
    const roomCheck = await this.db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM bookings
      WHERE room_id IS NOT NULL AND start_time >= ${monthStart.toISOString()}
    `);
    const hasRooms = (roomCheck as any).rows[0].cnt > 0;

    if (hasRooms) {
      // Room-level analytics (when room assignments exist)
      const result = await this.db.execute(sql`
        SELECT
          r.id AS room_id,
          r.name AS room_name,
          r.category,
          COUNT(b.id)::int AS bookings,
          COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600), 0)::numeric AS hours_sold,
          COALESCE(SUM(b.total_price), 0)::bigint AS revenue,
          CASE WHEN COUNT(b.id) > 0 THEN ROUND(SUM(b.total_price)::numeric / COUNT(b.id))::int ELSE 0 END AS avg_check
        FROM rooms r
        LEFT JOIN bookings b ON b.room_id = r.id
          AND b.start_time >= ${monthStart.toISOString()}
          AND b.status != 'cancelled'
          ${branchFilter}
        ${branchId ? sql`WHERE r.branch_id = ${branchId}` : sql``}
        GROUP BY r.id, r.name, r.category
        ORDER BY bookings DESC
      `);
      const rows = (result as any).rows as any[];
      const daysElapsed = now.getDate();
      const totalAvailableHours = daysElapsed * 18;
      return rows.map((r: any) => {
        const hoursSold = Math.round(Number(r.hours_sold));
        return {
          roomId: r.room_id, roomName: r.room_name, category: r.category,
          bookings: r.bookings, hoursSold, revenue: Number(r.revenue), avgCheck: r.avg_check,
          loadPct: totalAvailableHours > 0 ? Math.round((hoursSold / totalAvailableHours) * 100) : 0,
        };
      });
    }

    // Room-level analytics using rooms table, with bookings aggregated by branch
    // (since room_id is NULL, we distribute branch totals across rooms)
    const brFilter = branchId ? sql`WHERE r.branch_id = ${branchId}` : sql``;
    const roomsResult = await this.db.execute(sql`
      SELECT r.id, r.name, r.category, r.branch_id, r.capacity_max,
             br.name AS branch_name
      FROM rooms r
      JOIN branches br ON br.id = r.branch_id
      ${brFilter}
      ORDER BY r.branch_id, r.id
    `);
    const allRooms = (roomsResult as any).rows as any[];

    // Get branch-level totals
    const branchTotals = await this.db.execute(sql`
      SELECT
        branch_id,
        COUNT(*)::int AS bookings,
        COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)::numeric AS hours_sold,
        COALESCE(SUM(total_price), 0)::bigint AS revenue
      FROM bookings
      WHERE start_time >= ${monthStart.toISOString()}
        AND status != 'cancelled'
        ${branchId ? sql`AND branch_id = ${branchId}` : sql``}
      GROUP BY branch_id
    `);
    const branchMap = new Map((branchTotals as any).rows.map((r: any) => [r.branch_id, r]));

    // Count rooms per branch for distribution
    const roomsPerBranch = new Map<number, number>();
    for (const r of allRooms) {
      roomsPerBranch.set(r.branch_id, (roomsPerBranch.get(r.branch_id) || 0) + 1);
    }

    const daysElapsed = now.getDate();
    const hoursPerDay = 18;

    return allRooms.map((r: any) => {
      const bt: any = branchMap.get(r.branch_id);
      const roomCount = roomsPerBranch.get(r.branch_id) || 1;
      const branchBookings = bt ? bt.bookings : 0;
      const branchHours = bt ? Math.round(Number(bt.hours_sold)) : 0;
      const branchRevenue = bt ? Number(bt.revenue) : 0;

      // Distribute branch totals evenly across rooms
      const roomBookings = Math.round(branchBookings / roomCount);
      const roomHours = Math.round(branchHours / roomCount);
      const roomRevenue = Math.round(branchRevenue / roomCount);
      const avgCheck = roomBookings > 0 ? Math.round(roomRevenue / roomBookings) : 0;
      const totalAvailableHours = daysElapsed * hoursPerDay;

      return {
        roomId: r.id,
        roomName: `${r.name} (${r.branch_name?.replace(/^Харизма\s+/, '')})`,
        category: r.category,
        bookings: roomBookings,
        hoursSold: roomHours,
        revenue: roomRevenue,
        avgCheck,
        loadPct: totalAvailableHours > 0 ? Math.round((roomHours / totalAvailableHours) * 100) : 0,
      };
    });
  }

  async getCancellationAnalytics(branchId?: number) {
    const branchFilter = branchId ? sql`AND branch_id = ${branchId}` : sql``;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Current month stats
    const statsResult = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'cancelled'), 0)::bigint AS lost_revenue
      FROM bookings
      WHERE start_time >= ${monthStart.toISOString()}
        ${branchFilter}
    `);
    const stats = (statsResult as any).rows[0];

    const cancelRate = stats.total > 0
      ? Math.round((stats.cancelled_count / stats.total) * 1000) / 10
      : 0;

    // By source breakdown
    const sourceResult = await this.db.execute(sql`
      SELECT
        source,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM bookings
      WHERE start_time >= ${monthStart.toISOString()}
        ${branchFilter}
      GROUP BY source
      ORDER BY total DESC
    `);
    const sourceRows = (sourceResult as any).rows as any[];
    const sourceBreakdown = sourceRows.map((r: any) => ({
      source: r.source,
      total: r.total,
      cancelled: r.cancelled,
      rate: r.total > 0 ? Math.round((r.cancelled / r.total) * 1000) / 10 : 0,
    }));

    // Recent cancelled bookings
    const recentResult = await this.db.execute(sql`
      SELECT
        b.id,
        b.start_time AS date,
        b.guest_name,
        COALESCE(r.name, 'Без зала') AS room_name,
        b.source,
        b.total_price AS lost_amount
      FROM bookings b
      LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.status = 'cancelled'
        ${branchFilter}
      ORDER BY b.updated_at DESC
      LIMIT 50
    `);
    const recentRows = (recentResult as any).rows as any[];
    const recent = recentRows.map((r: any) => ({
      id: r.id,
      date: r.date,
      guestName: r.guest_name,
      roomName: r.room_name,
      reason: 'Отмена',
      source: r.source,
      lostAmount: Number(r.lost_amount),
      isNoShow: false,
    }));

    return {
      cancelledCount: stats.cancelled_count,
      noShowCount: 0,
      cancelRate,
      noShowRate: 0,
      lostRevenue: Number(stats.lost_revenue),
      reasonBreakdown: [
        { reason: 'Отмена клиентом', count: stats.cancelled_count },
      ],
      sourceBreakdown,
      recent,
    };
  }

  async getManagerAnalytics(branchId?: number) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const bf = branchId ? sql`AND branch_id = ${branchId}` : sql``;

    const result = await this.db.execute(sql`
      SELECT
        manager_bitrix_id,
        manager_name,
        COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))::int AS bookings,
        COUNT(*)::int AS total_inquiries,
        COALESCE(SUM(total_price) FILTER (WHERE status NOT IN ('cancelled')), 0)::bigint AS revenue,
        COALESCE(SUM(guest_count) FILTER (WHERE status NOT IN ('cancelled')), 0)::int AS guests
      FROM bookings
      WHERE manager_name IS NOT NULL
        AND start_time >= ${monthStart.toISOString()}
        AND start_time <= ${now.toISOString()}
        ${bf}
      GROUP BY manager_bitrix_id, manager_name
      ORDER BY revenue DESC
    `);

    const rows = (result as any).rows || [];
    return rows.map((r: any) => {
      const revenue = Number(r.revenue);
      const bookings = r.bookings;
      const totalInquiries = r.total_inquiries;
      const conversion = totalInquiries > 0 ? Math.round((bookings / totalInquiries) * 100) : 0;
      const avgCheck = bookings > 0 ? Math.round(revenue / bookings) : 0;
      const plan = Math.round(revenue * 1.2); // 20% growth target placeholder
      const planPct = plan > 0 ? Math.round((revenue / plan) * 100) : 0;
      const motivationPct = planPct >= 100 ? 5 : planPct >= 70 ? 3 : 2;
      const motivation = Math.round(revenue * motivationPct / 100);

      return {
        managerId: r.manager_bitrix_id,
        managerName: r.manager_name,
        bookings,
        totalInquiries,
        conversion,
        revenue,
        avgCheck,
        plan,
        planPct,
        motivationPct,
        motivation,
      };
    });
  }
}
