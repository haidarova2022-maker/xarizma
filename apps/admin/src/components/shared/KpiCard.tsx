import { Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

export function LflBadge({ value }: { value: number }) {
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

export function KpiCard({ icon, iconColor, label, value, formatted, lfl, sublabel, last }: {
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

export function PlanRing({ fact, plan, color, size = 80 }: { fact: number; plan: number; color: string; size?: number }) {
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
