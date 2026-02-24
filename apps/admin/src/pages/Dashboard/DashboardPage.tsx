import { useEffect, useState } from 'react';
import { Card, Typography, Progress } from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  DollarOutlined,
  FunnelPlotOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useBranchStore } from '../../stores/branch-store';
import { getDashboardStats, getBookings, getRooms, getSlotConfig } from '../../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

interface DashStats {
  bookingsMonth: number;
  bookingsToday: number;
  guestsMonth: number;
  guestsToday: number;
  bookingsLfl: number;
  guestsLfl: number;
  bookingsLastYear: number;
  guestsLastYear: number;
  revenueMonth: number;
  revenueLastYear: number;
  revenueLfl: number;
  revenuePlan: number;
  avgCheck: number;
  avgCheckLastYear: number;
  avgCheckLfl: number;
  avgCheckPlan: number;
  leadsMonth: number;
  leadsToday: number;
  leadsLastYear: number;
  leadsLfl: number;
  conversionRate: number;
  conversionLastYear: number;
}

interface BranchLoad {
  branchId: number;
  name: string;
  bookings: number;
  totalSlots: number;
  percent: number;
}

/* ── Shared components ── */

function LflBadge({ value }: { value: number }) {
  const isUp = value >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      backgroundColor: isUp ? '#F6FFED' : '#FFF2F0',
      color: isUp ? '#52c41a' : '#ff4d4f',
    }}>
      {isUp ? <ArrowUpOutlined style={{ fontSize: 10 }} /> : <ArrowDownOutlined style={{ fontSize: 10 }} />}
      {isUp ? '+' : ''}{value}%
    </span>
  );
}

function KpiCard({ icon, iconColor, label, value, formatted, lfl, sublabel, last }: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value?: number;
  formatted?: string;
  lfl?: number;
  sublabel?: string;
  last?: boolean;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 180, padding: '20px 24px',
      borderRight: last ? 'none' : '1px solid #f0f0f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          backgroundColor: `${iconColor}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: iconColor,
        }}>
          {icon}
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
          {formatted ?? value}
        </span>
        {lfl !== undefined && <LflBadge value={lfl} />}
      </div>
      {sublabel && (
        <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
          {sublabel}
        </Text>
      )}
    </div>
  );
}

/* ── Ring gauge via SVG ── */

function PlanRing({ fact, plan, color, size = 80 }: { fact: number; plan: number; color: string; size?: number }) {
  const pct = plan > 0 ? Math.min(fact / plan, 1) : 0;
  const pctDisplay = Math.round(pct * 100);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 16, color: '#1a1a1a',
      }}>
        {pctDisplay}%
      </div>
    </div>
  );
}

/* ── Plan-fact KPI card ── */

function PlanFactCard({ icon, iconColor, label, fact, plan, lfl, lflLabel, last }: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  fact: number;
  plan: number;
  lfl: number;
  lflLabel: string;
  last?: boolean;
}) {
  const remaining = Math.max(0, plan - fact);
  const pct = plan > 0 ? Math.round((fact / plan) * 100) : 0;

  return (
    <div style={{
      flex: 1, minWidth: 260, padding: '20px 24px',
      borderRight: last ? 'none' : '1px solid #f0f0f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          backgroundColor: `${iconColor}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: iconColor,
        }}>
          {icon}
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
          {fmt(fact)} ₽
        </span>
        <LflBadge value={lfl} />
      </div>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 14 }}>
        {lflLabel}
      </Text>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 14px', borderRadius: 8,
        backgroundColor: '#FAFBFF', border: '1px solid #f0f0f0',
      }}>
        <PlanRing fact={fact} plan={plan} color={pct >= 100 ? '#52c41a' : iconColor} />
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 6 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>План</Text>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{fmt(plan)} ₽</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {remaining > 0 ? 'Осталось до плана' : 'План выполнен!'}
            </Text>
            <div style={{
              fontWeight: 600, fontSize: 15,
              color: remaining > 0 ? '#ff4d4f' : '#52c41a',
            }}>
              {remaining > 0 ? `${fmt(remaining)} ₽` : `+${fmt(fact - plan)} ₽`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Marketing / Funnel card ── */

function MarketingRow({ stats }: { stats: DashStats }) {
  const convDelta = +(stats.conversionRate - stats.conversionLastYear).toFixed(1);
  const convUp = convDelta >= 0;

  return (
    <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* Leads month */}
        <KpiCard
          icon={<ThunderboltOutlined />}
          iconColor="#E17055"
          label="Лидов за месяц"
          value={stats.leadsMonth}
          lfl={stats.leadsLfl}
          sublabel={`LFL: ${stats.leadsLastYear} в прошлом году`}
        />

        {/* Leads today */}
        <KpiCard
          icon={<ThunderboltOutlined />}
          iconColor="#FDCB6E"
          label="Лидов сегодня"
          value={stats.leadsToday}
        />

        {/* Conversion funnel */}
        <div style={{
          flex: 2, minWidth: 360, padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              backgroundColor: '#E36FA815',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#E36FA8',
            }}>
              <FunnelPlotOutlined />
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>Конверсия лиды → брони</Text>
          </div>

          {/* Funnel visual */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12,
          }}>
            {/* Leads block */}
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#E17055' }}>{stats.leadsMonth}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>лидов</Text>
            </div>

            {/* Funnel bar */}
            <div style={{ flex: 1 }}>
              <div style={{
                position: 'relative', height: 32, borderRadius: 16,
                backgroundColor: '#f0f0f0', overflow: 'hidden',
              }}>
                {/* Full bar = leads */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: '100%', borderRadius: 16,
                  background: 'linear-gradient(90deg, #E1705520, #E1705510)',
                }} />
                {/* Conversion fill */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${Math.max(stats.conversionRate, 2)}%`,
                  borderRadius: 16,
                  background: 'linear-gradient(90deg, #E36FA8, #49BCCB)',
                  transition: 'width 0.6s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 60,
                }} />
              </div>
              {/* Scale labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 10 }}>0%</Text>
                <Text type="secondary" style={{ fontSize: 10 }}>50%</Text>
                <Text type="secondary" style={{ fontSize: 10 }}>100%</Text>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ fontSize: 18, color: '#E36FA8', fontWeight: 700 }}>→</div>

            {/* Bookings block */}
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#E36FA8' }}>{stats.bookingsMonth}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>броней</Text>
            </div>
          </div>

          {/* Conversion rate + LFL */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 12px', borderRadius: 6,
            backgroundColor: '#FAFBFF', border: '1px solid #f0f0f0',
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#E36FA8' }}>
              {stats.conversionRate}%
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              backgroundColor: convUp ? '#F6FFED' : '#FFF2F0',
              color: convUp ? '#52c41a' : '#ff4d4f',
            }}>
              {convUp
                ? <><ArrowUpOutlined style={{ fontSize: 10 }} /> +{convDelta}pp</>
                : <><ArrowDownOutlined style={{ fontSize: 10 }} /> {convDelta}pp</>
              }
            </span>
            <Text type="secondary" style={{ fontSize: 11 }}>
              LFL: {stats.conversionLastYear}% в прошлом году
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Main ── */

export default function DashboardPage() {
  const { selectedBranchId, branches } = useBranchStore();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [branchLoads, setBranchLoads] = useState<BranchLoad[]>([]);

  useEffect(() => {
    if (!selectedBranchId) return;
    getDashboardStats(selectedBranchId)
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, [selectedBranchId]);

  useEffect(() => {
    if (!branches.length) return;
    const today = dayjs().startOf('day').toISOString();
    const tomorrow = dayjs().endOf('day').toISOString();

    Promise.all([
      getBookings({ dateFrom: today, dateTo: tomorrow }),
      getRooms(),
      getSlotConfig(),
    ]).then(([bookingsRes, roomsRes, cfgRes]) => {
      const allBookings = bookingsRes.data.filter((b: any) => b.status !== 'cancelled');
      const allRooms = roomsRes.data;

      // Calculate slots per day from config
      const cfg = cfgRes.data;
      const step = cfg.slotDuration + cfg.gapHours;
      const operatingHours = 16; // 9:00 → 01:00
      const slotsPerDay = Math.floor(operatingHours / step);

      const loads: BranchLoad[] = branches.map((br: any) => {
        const count = allBookings.filter((b: any) => b.branchId === br.id).length;
        const roomCount = allRooms.filter((r: any) => r.branchId === br.id).length;
        const totalSlots = roomCount * slotsPerDay;
        const percent = totalSlots > 0 ? Math.min(100, Math.round((count / totalSlots) * 100)) : 0;
        const shortName = br.name.replace(/^Харизма\s+/, '');
        return { branchId: br.id, name: shortName, bookings: count, totalSlots, percent };
      });
      setBranchLoads(loads);
    }).catch(() => {});
  }, [branches]);

  const branch = branches.find((b: any) => b.id === selectedBranchId);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Дашборд {branch ? `— ${branch.name}` : ''}
      </Title>

      {/* Row 0: Marketing — Leads + Conversion */}
      {stats && <MarketingRow stats={stats} />}

      {/* Row 1: Bookings + Guests */}
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <KpiCard
            icon={<CalendarOutlined />}
            iconColor="#E36FA8"
            label="Бронирований за месяц"
            value={stats?.bookingsMonth ?? 0}
            lfl={stats?.bookingsLfl}
            sublabel={stats ? `LFL: ${stats.bookingsLastYear} в прошлом году` : undefined}
          />
          <KpiCard
            icon={<CalendarOutlined />}
            iconColor="#00B894"
            label="Бронирований сегодня"
            value={stats?.bookingsToday ?? 0}
          />
          <KpiCard
            icon={<TeamOutlined />}
            iconColor="#FDCB6E"
            label="Гостей за месяц"
            value={stats?.guestsMonth ?? 0}
            lfl={stats?.guestsLfl}
            sublabel={stats ? `LFL: ${stats.guestsLastYear} в прошлом году` : undefined}
          />
          <KpiCard
            icon={<TeamOutlined />}
            iconColor="#49BCCB"
            label="Гостей сегодня"
            value={stats?.guestsToday ?? 0}
            last
          />
        </div>
      </Card>

      {/* Row 2: Revenue + Avg Check with plan-fact */}
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <PlanFactCard
            icon={<DollarOutlined />}
            iconColor="#E36FA8"
            label="Выручка за месяц"
            fact={stats?.revenueMonth ?? 0}
            plan={stats?.revenuePlan ?? 0}
            lfl={stats?.revenueLfl ?? 0}
            lflLabel={stats ? `LFL: ${fmt(stats.revenueLastYear)} ₽ в прошлом году` : ''}
          />
          <PlanFactCard
            icon={<DollarOutlined />}
            iconColor="#00B894"
            label="Средний чек"
            fact={stats?.avgCheck ?? 0}
            plan={stats?.avgCheckPlan ?? 0}
            lfl={stats?.avgCheckLfl ?? 0}
            lflLabel={stats ? `LFL: ${fmt(stats.avgCheckLastYear)} ₽ в прошлом году` : ''}
            last
          />
        </div>
      </Card>

      {/* Branch load */}
      <Card>
        <Title level={4} style={{ marginBottom: 20 }}>Загрузка филиалов</Title>
        {branchLoads.map((bl) => (
          <div key={bl.branchId} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 500, fontSize: 15 }}>{bl.name}</span>
              <span style={{ color: '#8c8c8c' }}>{bl.bookings} из {bl.totalSlots} слотов · {bl.percent}%</span>
            </div>
            <Progress
              percent={bl.percent}
              showInfo={false}
              strokeColor="#FDCB6E"
              trailColor="#f0f0f0"
              size="small"
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
