import { useEffect, useState } from 'react';
import { Typography, Table, Tag, Card, Row, Col, Statistic, Space, Select } from 'antd';
import {
  MessageOutlined, MailOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getNotifications } from '../../api/client';

const { Title } = Typography;

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS',
  email: 'Email',
  push: 'Push',
  max: 'MAX',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  sms: <MessageOutlined />,
  email: <MailOutlined />,
};

const TEMPLATE_LABELS: Record<string, string> = {
  booking_created: 'Бронь создана',
  booking_confirmed: 'Бронь подтверждена',
  payment_received: 'Оплата получена',
  booking_reminder: 'Напоминание',
  booking_cancelled: 'Отмена брони',
  waitlist_available: 'Место освободилось',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'В очереди',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  failed: 'Ошибка',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  sent: 'blue',
  delivered: 'green',
  failed: 'red',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (channelFilter) params.channel = channelFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await getNotifications(params);
      setNotifications(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotifications(); }, [channelFilter, statusFilter]);

  // Stats
  const total = notifications.length;
  const sent = notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length;
  const failed = notifications.filter(n => n.status === 'failed').length;
  const pending = notifications.filter(n => n.status === 'pending').length;

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: 'Канал',
      dataIndex: 'channel',
      key: 'channel',
      render: (c: string) => (
        <Space>
          {CHANNEL_ICONS[c]}
          <span>{CHANNEL_LABELS[c] || c}</span>
        </Space>
      ),
    },
    {
      title: 'Шаблон',
      dataIndex: 'template',
      key: 'template',
      render: (t: string) => TEMPLATE_LABELS[t] || t,
    },
    {
      title: 'Бронь',
      dataIndex: 'bookingId',
      key: 'bookingId',
      render: (id: number) => id ? `#${id}` : '—',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s] || s}</Tag>,
    },
    {
      title: 'Отправлено',
      dataIndex: 'sentAt',
      key: 'sentAt',
      render: (d: string) => d ? dayjs(d).format('DD.MM.YY HH:mm') : '—',
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: 'Ошибка',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (e: string) => e || '—',
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>Уведомления</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Всего" value={total} prefix={<MessageOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Отправлено" value={sent} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="В очереди" value={pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Ошибки" value={failed} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      {/* SMS / WhatsApp / MAX info (4.2) */}
      <Card size="small" style={{ marginBottom: 16, background: '#FFFBE6', borderColor: '#FFE58F' }}>
        <Typography.Text>
          <strong>Каналы уведомлений:</strong> SMS (основной), MAX (по номеру телефона).
          WhatsApp — недоступен (нельзя писать первыми). Email — для подтверждений оплаты.
        </Typography.Text>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            allowClear
            placeholder="Канал"
            style={{ width: 140 }}
            value={channelFilter}
            onChange={setChannelFilter}
            options={Object.entries(CHANNEL_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Select
            allowClear
            placeholder="Статус"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
        </Space>
      </div>

      <Table columns={columns} dataSource={notifications} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
