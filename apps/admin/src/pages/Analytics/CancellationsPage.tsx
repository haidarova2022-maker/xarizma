import { useEffect, useState } from 'react';
import { Typography, Card, Table, Tag } from 'antd';
import { CloseCircleOutlined, ExclamationCircleOutlined, DollarOutlined, PercentageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getCancellationAnalytics } from '../../api/client';
import { KpiCard, fmt } from '../../components/shared/KpiCard';

const { Title, Text } = Typography;

const SOURCE_LABELS: Record<string, string> = {
  widget: 'Виджет',
  admin: 'Админ',
  phone: 'Телефон',
  walkin: 'Walk-in',
};

interface CancellationData {
  cancelledCount: number;
  noShowCount: number;
  cancelRate: number;
  noShowRate: number;
  lostRevenue: number;
  reasonBreakdown: { reason: string; count: number }[];
  sourceBreakdown: { source: string; total: number; cancelled: number; rate: number }[];
  recent: {
    id: number;
    date: string;
    guestName: string;
    roomName: string;
    reason: string;
    source: string;
    lostAmount: number;
    isNoShow: boolean;
  }[];
}

export default function CancellationsPage() {
  const { selectedBranchId } = useBranchStore();
  const [data, setData] = useState<CancellationData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedBranchId) return;
    setLoading(true);
    getCancellationAnalytics(selectedBranchId)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const recentColumns = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    { title: 'Гость', dataIndex: 'guestName', key: 'guestName' },
    { title: 'Зал', dataIndex: 'roomName', key: 'roomName' },
    {
      title: 'Причина',
      dataIndex: 'reason',
      key: 'reason',
      render: (r: string, rec: any) => (
        <span>
          {rec.isNoShow && <Tag color="volcano" style={{ marginRight: 4 }}>No-show</Tag>}
          {r}
        </span>
      ),
    },
    {
      title: 'Источник',
      dataIndex: 'source',
      key: 'source',
      render: (s: string) => SOURCE_LABELS[s] || s,
    },
    {
      title: 'Потери',
      dataIndex: 'lostAmount',
      key: 'lostAmount',
      render: (v: number) => <Text type="danger" strong>{fmt(v)} ₽</Text>,
    },
  ];

  const maxReasonCount = data?.reasonBreakdown?.length
    ? Math.max(...data.reasonBreakdown.map(r => r.count))
    : 1;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Отмены и No-show</Title>

      {/* KPI row */}
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 16 }} loading={loading}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <KpiCard
            icon={<CloseCircleOutlined />}
            iconColor="#ff4d4f"
            label="Отменено"
            value={data?.cancelledCount ?? 0}
          />
          <KpiCard
            icon={<ExclamationCircleOutlined />}
            iconColor="#fa8c16"
            label="No-show"
            value={data?.noShowCount ?? 0}
          />
          <KpiCard
            icon={<PercentageOutlined />}
            iconColor="#E36FA8"
            label="Процент отмен"
            formatted={`${data?.cancelRate ?? 0}%`}
          />
          <KpiCard
            icon={<DollarOutlined />}
            iconColor="#ff4d4f"
            label="Потерянная выручка"
            formatted={`${fmt(data?.lostRevenue ?? 0)} ₽`}
            last
          />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Reason breakdown */}
        <Card loading={loading}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Причины отмен</Text>
          {data?.reasonBreakdown?.map(({ reason, count }) => (
            <div key={reason} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13 }}>{reason}</Text>
                <Text strong>{count}</Text>
              </div>
              <div style={{ height: 16, borderRadius: 8, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(count / maxReasonCount) * 100}%`,
                  borderRadius: 8,
                  backgroundColor: '#ff4d4f',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
          {(!data?.reasonBreakdown || data.reasonBreakdown.length === 0) && (
            <Text type="secondary">Нет данных</Text>
          )}
        </Card>

        {/* Source breakdown */}
        <Card loading={loading}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Отмены по источникам</Text>
          <Table
            dataSource={data?.sourceBreakdown || []}
            rowKey="source"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Источник',
                dataIndex: 'source',
                key: 'source',
                render: (s: string) => SOURCE_LABELS[s] || s,
              },
              { title: 'Всего', dataIndex: 'total', key: 'total' },
              { title: 'Отмен', dataIndex: 'cancelled', key: 'cancelled' },
              {
                title: '% отмен',
                dataIndex: 'rate',
                key: 'rate',
                render: (v: number) => (
                  <Tag color={v > 20 ? 'red' : v > 10 ? 'orange' : 'green'}>{v}%</Tag>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* Recent cancellations */}
      <Card loading={loading}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Последние отмены</Text>
        <Table
          columns={recentColumns}
          dataSource={data?.recent || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
