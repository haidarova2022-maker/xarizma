import { useEffect, useState } from 'react';
import { Typography, Table, Tag, Button, Space, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getWaitlist, updateWaitlistEntry } from '../../api/client';

const { Title } = Typography;

const STATUS_LABELS: Record<string, string> = {
  active: 'Ожидает',
  notified: 'Уведомлён',
  booked: 'Забронировал',
  expired: 'Истёк',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'gold',
  notified: 'blue',
  booked: 'green',
  expired: 'default',
};

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  pobratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

export default function WaitlistPage() {
  const { selectedBranchId } = useBranchStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWaitlist = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const { data } = await getWaitlist({ branchId: selectedBranchId });
      setEntries(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWaitlist(); }, [selectedBranchId]);

  const handleNotify = async (id: number) => {
    try {
      await updateWaitlistEntry(id, { status: 'notified' });
      message.success('Клиент помечен как уведомлённый');
      loadWaitlist();
    } catch {
      message.error('Ошибка');
    }
  };

  const handleExpire = async (id: number) => {
    try {
      await updateWaitlistEntry(id, { status: 'expired' });
      message.success('Запись закрыта');
      loadWaitlist();
    } catch {
      message.error('Ошибка');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Гость', dataIndex: 'guestName', key: 'guestName' },
    { title: 'Телефон', dataIndex: 'guestPhone', key: 'guestPhone' },
    {
      title: 'Категория',
      dataIndex: 'roomCategory',
      key: 'roomCategory',
      render: (c: string) => CATEGORY_LABELS[c] || c,
    },
    { title: 'Гостей', dataIndex: 'guestCount', key: 'guestCount', width: 80 },
    {
      title: 'Желаемая дата',
      dataIndex: 'desiredDate',
      key: 'desiredDate',
      render: (d: string) => dayjs(d).format('DD.MM.YYYY'),
    },
    {
      title: 'Время',
      key: 'time',
      render: (_: any, r: any) => `${r.desiredTimeFrom} – ${r.desiredTimeTo}`,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, r: any) => r.status === 'active' ? (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleNotify(r.id)}
            title="Уведомить"
          />
          <Button
            type="link"
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleExpire(r.id)}
            title="Закрыть"
          />
        </Space>
      ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Лист ожидания</Title>
        <Tag color="gold" style={{ fontSize: 14, padding: '4px 12px' }}>
          {entries.filter(e => e.status === 'active').length} активных
        </Tag>
      </div>

      <Table columns={columns} dataSource={entries} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
