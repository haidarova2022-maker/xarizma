import { useEffect, useState } from 'react';
import { Typography, Card, Table, Tag } from 'antd';
import { UserOutlined, TrophyOutlined } from '@ant-design/icons';
import { useBranchStore } from '../../stores/branch-store';
import { getManagerAnalytics } from '../../api/client';
import { PlanRing, fmt } from '../../components/shared/KpiCard';

const { Title, Text } = Typography;

interface ManagerData {
  managerId: number;
  managerName: string;
  bookings: number;
  revenue: number;
  avgCheck: number;
  plan: number;
  planPct: number;
}

const MEDALS = ['', '#FFD700', '#C0C0C0', '#CD7F32'];

export default function ManagerReportPage() {
  const { selectedBranchId } = useBranchStore();
  const [data, setData] = useState<ManagerData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedBranchId) return;
    setLoading(true);
    getManagerAnalytics(selectedBranchId)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const columns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_: any, __: any, idx: number) => {
        const color = MEDALS[idx + 1];
        return color
          ? <TrophyOutlined style={{ color, fontSize: 18 }} />
          : <span style={{ color: '#8c8c8c' }}>{idx + 1}</span>;
      },
    },
    {
      title: 'Менеджер',
      dataIndex: 'managerName',
      key: 'managerName',
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: '#E36FA815', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <UserOutlined style={{ color: '#E36FA8' }} />
          </div>
          <Text strong>{name}</Text>
        </div>
      ),
    },
    {
      title: 'Бронирований',
      dataIndex: 'bookings',
      key: 'bookings',
      render: (v: number) => <Tag>{v}</Tag>,
    },
    {
      title: 'Выручка',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (v: number) => <Text strong>{fmt(v)} ₽</Text>,
    },
    {
      title: 'Ср. чек',
      dataIndex: 'avgCheck',
      key: 'avgCheck',
      render: (v: number) => `${fmt(v)} ₽`,
    },
    {
      title: 'План',
      key: 'plan',
      width: 120,
      render: (_: any, r: ManagerData) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlanRing
            fact={r.revenue}
            plan={r.plan}
            color={r.planPct >= 100 ? '#52c41a' : '#E36FA8'}
            size={44}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>{fmt(r.plan)} ₽</Text>
        </div>
      ),
    },
    {
      title: '% плана',
      dataIndex: 'planPct',
      key: 'planPct',
      render: (v: number) => (
        <Tag color={v >= 100 ? 'green' : v >= 70 ? 'orange' : 'red'}>
          {v}%
        </Tag>
      ),
    },
  ];

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalBookings = data.reduce((s, d) => s + d.bookings, 0);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Отчёт по менеджерам</Title>

      {/* Summary row */}
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }} loading={loading}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180, padding: '20px 24px', borderRight: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Всего менеджеров</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{data.length}</div>
          </div>
          <div style={{ flex: 1, minWidth: 180, padding: '20px 24px', borderRight: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Общая выручка</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{fmt(totalRevenue)} ₽</div>
          </div>
          <div style={{ flex: 1, minWidth: 180, padding: '20px 24px' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Всего бронирований</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{totalBookings}</div>
          </div>
        </div>
      </Card>

      {/* Manager table */}
      <Card loading={loading}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="managerId"
          pagination={false}
        />
      </Card>
    </div>
  );
}
