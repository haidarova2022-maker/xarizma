import { useEffect, useState } from 'react';
import { Typography, Card, Table, Tag } from 'antd';
import { useBranchStore } from '../../stores/branch-store';
import { getRoomAnalytics } from '../../api/client';
import { fmt } from '../../components/shared/KpiCard';

const { Title, Text } = Typography;

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

const CATEGORY_COLORS: Record<string, string> = {
  bratski: 'blue',
  vibe: 'green',
  flex: 'orange',
  full_gas: 'red',
};

interface RoomData {
  roomId: number;
  roomName: string;
  category: string;
  bookings: number;
  hoursSold: number;
  revenue: number;
  avgCheck: number;
  loadPct: number;
}

export default function RoomAnalyticsPage() {
  const { selectedBranchId } = useBranchStore();
  const [data, setData] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedBranchId) return;
    setLoading(true);
    getRoomAnalytics(selectedBranchId)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  // Group by category for subtotals
  const categories = ['bratski', 'vibe', 'flex', 'full_gas'];
  const grouped: { key: string; isSubtotal?: boolean; roomName: string; category: string; bookings: number; hoursSold: number; revenue: number; avgCheck: number; loadPct: number }[] = [];

  for (const cat of categories) {
    const catRooms = data.filter(r => r.category === cat);
    if (catRooms.length === 0) continue;

    catRooms.forEach(r => grouped.push({ key: `room-${r.roomId}`, ...r }));

    const totalBookings = catRooms.reduce((s, r) => s + r.bookings, 0);
    const totalRevenue = catRooms.reduce((s, r) => s + r.revenue, 0);
    const totalHours = catRooms.reduce((s, r) => s + r.hoursSold, 0);
    const avgLoad = catRooms.length > 0 ? Math.round(catRooms.reduce((s, r) => s + r.loadPct, 0) / catRooms.length) : 0;

    grouped.push({
      key: `subtotal-${cat}`,
      isSubtotal: true,
      roomName: `Итого ${CATEGORY_LABELS[cat]}`,
      category: cat,
      bookings: totalBookings,
      hoursSold: totalHours,
      revenue: totalRevenue,
      avgCheck: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
      loadPct: avgLoad,
    });
  }

  const columns = [
    {
      title: 'Зал',
      dataIndex: 'roomName',
      key: 'roomName',
      render: (name: string, r: any) => (
        <Text strong={r.isSubtotal} style={{ fontSize: r.isSubtotal ? 14 : 13 }}>
          {name}
        </Text>
      ),
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (c: string, r: any) => r.isSubtotal ? null : (
        <Tag color={CATEGORY_COLORS[c]}>{CATEGORY_LABELS[c]}</Tag>
      ),
    },
    {
      title: 'Брони',
      dataIndex: 'bookings',
      key: 'bookings',
      render: (v: number, r: any) => (
        <Text strong={r.isSubtotal}>{v}</Text>
      ),
    },
    {
      title: 'Часов',
      dataIndex: 'hoursSold',
      key: 'hoursSold',
      render: (v: number, r: any) => (
        <Text strong={r.isSubtotal}>{v}</Text>
      ),
    },
    {
      title: 'Выручка',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (v: number, r: any) => (
        <Text strong={r.isSubtotal}>{fmt(v)} ₽</Text>
      ),
    },
    {
      title: 'Ср. чек',
      dataIndex: 'avgCheck',
      key: 'avgCheck',
      render: (v: number) => `${fmt(v)} ₽`,
    },
    {
      title: 'Загрузка',
      dataIndex: 'loadPct',
      key: 'loadPct',
      render: (v: number, r: any) => {
        const color = v < 20 ? '#ff4d4f' : v < 50 ? '#faad14' : '#52c41a';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(v, 100)}%`, borderRadius: 4, backgroundColor: color }} />
            </div>
            <Text strong={r.isSubtotal} style={{ color, fontSize: 13 }}>{v}%</Text>
          </div>
        );
      },
    },
  ];

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = data.reduce((s, r) => s + r.bookings, 0);
  const underperforming = data.filter(r => r.loadPct < 20).length;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Аналитика по залам</Title>

      {/* Summary */}
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }} loading={loading}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180, padding: '20px 24px', borderRight: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Залов</Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{data.length}</div>
          </div>
          <div style={{ flex: 1, minWidth: 180, padding: '20px 24px', borderRight: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Общая выручка</Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(totalRevenue)} ₽</div>
          </div>
          <div style={{ flex: 1, minWidth: 180, padding: '20px 24px', borderRight: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Бронирований</Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{totalBookings}</div>
          </div>
          <div style={{ flex: 1, minWidth: 180, padding: '20px 24px' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Низкая загрузка</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: underperforming > 0 ? '#ff4d4f' : '#52c41a' }}>
              {underperforming}
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card loading={loading}>
        <Table
          columns={columns}
          dataSource={grouped}
          rowKey="key"
          pagination={false}
          rowClassName={(r: any) => r.isSubtotal ? 'subtotal-row' : ''}
          style={{ fontSize: 13 }}
        />
        <style>{`.subtotal-row td { background-color: #fafafa !important; border-top: 2px solid #e8e8e8; }`}</style>
      </Card>
    </div>
  );
}
