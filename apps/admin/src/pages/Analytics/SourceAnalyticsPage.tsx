import { useEffect, useState } from 'react';
import { Typography, Card, Table, Tag } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { useBranchStore } from '../../stores/branch-store';
import { getSourceAnalytics } from '../../api/client';
import { KpiCard, LflBadge, fmt } from '../../components/shared/KpiCard';

const { Title, Text } = Typography;

const SOURCE_LABELS: Record<string, string> = {
  widget: 'Виджет',
  admin: 'Админ',
  phone: 'Телефон',
  walkin: 'Walk-in',
};

const SOURCE_COLORS: Record<string, string> = {
  widget: '#49BCCB',
  admin: '#E36FA8',
  phone: '#FDCB6E',
  walkin: '#00B894',
};

interface SourceData {
  source: string;
  bookings: number;
  revenue: number;
  avgCheck: number;
  lfl: number;
  lastYearBookings: number;
}

export default function SourceAnalyticsPage() {
  const { selectedBranchId } = useBranchStore();
  const [data, setData] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedBranchId) return;
    setLoading(true);
    getSourceAnalytics(selectedBranchId)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  const columns = [
    {
      title: 'Источник',
      dataIndex: 'source',
      key: 'source',
      render: (s: string) => (
        <Tag color={SOURCE_COLORS[s] || 'default'} style={{ fontWeight: 600 }}>
          {SOURCE_LABELS[s] || s}
        </Tag>
      ),
    },
    { title: 'Бронирований', dataIndex: 'bookings', key: 'bookings' },
    {
      title: 'Выручка',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (v: number) => `${fmt(v)} ₽`,
    },
    {
      title: 'Ср. чек',
      dataIndex: 'avgCheck',
      key: 'avgCheck',
      render: (v: number) => `${fmt(v)} ₽`,
    },
    {
      title: 'Доля выручки',
      key: 'share',
      render: (_: any, r: SourceData) => {
        const pct = totalRevenue > 0 ? Math.round((r.revenue / totalRevenue) * 100) : 0;
        return `${pct}%`;
      },
    },
    {
      title: 'LFL',
      dataIndex: 'lfl',
      key: 'lfl',
      render: (v: number) => <LflBadge value={v} />,
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Аналитика по источникам</Title>

      {/* KPI row */}
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }} loading={loading}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {data.map((d, i) => (
            <KpiCard
              key={d.source}
              icon={<ShopOutlined />}
              iconColor={SOURCE_COLORS[d.source] || '#999'}
              label={SOURCE_LABELS[d.source] || d.source}
              value={d.bookings}
              lfl={d.lfl}
              sublabel={`LFL: ${d.lastYearBookings} в прошлом году`}
              last={i === data.length - 1}
            />
          ))}
        </div>
      </Card>

      {/* Revenue bars */}
      <Card style={{ marginBottom: 16 }} loading={loading}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Выручка по источникам</Text>
        {data.map(d => {
          const pct = Math.max((d.revenue / maxRevenue) * 100, 2);
          return (
            <div key={d.source} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontWeight: 500 }}>{SOURCE_LABELS[d.source] || d.source}</Text>
                <Text strong>{fmt(d.revenue)} ₽</Text>
              </div>
              <div style={{ height: 24, borderRadius: 12, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 12,
                  backgroundColor: SOURCE_COLORS[d.source] || '#999',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          );
        })}
      </Card>

      {/* Table */}
      <Card loading={loading}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="source"
          pagination={false}
        />
      </Card>
    </div>
  );
}
