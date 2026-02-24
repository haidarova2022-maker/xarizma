import { useEffect, useState } from 'react';
import { Typography, Table, Tag, Select, DatePicker, Space, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getBookings } from '../../api/client';
import BookingFormModal from '../../components/BookingForm/BookingFormModal';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<string, string> = {
  new: 'gold',
  awaiting_payment: 'orange',
  partially_paid: 'green',
  fully_paid: 'green',
  walkin: 'purple',
  completed: 'cyan',
  cancelled: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  awaiting_payment: 'Ожидает оплаты',
  partially_paid: 'Частичная оплата',
  fully_paid: 'Оплачена',
  walkin: 'Ситуативная',
  completed: 'Реализована',
  cancelled: 'Отменена',
};

const SOURCE_LABELS: Record<string, string> = {
  widget: 'Виджет',
  admin: 'Админ',
  phone: 'Телефон',
  walkin: 'Walk-in',
};

const SOURCE_COLORS: Record<string, string> = {
  widget: 'blue',
  admin: 'default',
  phone: 'cyan',
  walkin: 'purple',
};

export default function BookingsPage() {
  const { selectedBranchId } = useBranchStore();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const loadBookings = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    const params: any = { branchId: selectedBranchId };
    if (statusFilter) params.status = statusFilter;
    if (sourceFilter) params.source = sourceFilter;
    if (dateRange) {
      params.dateFrom = dateRange[0].startOf('day').toISOString();
      params.dateTo = dateRange[1].endOf('day').toISOString();
    }
    try {
      const { data } = await getBookings(params);
      setBookings(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, [selectedBranchId, statusFilter, sourceFilter, dateRange]);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Источник',
      dataIndex: 'source',
      key: 'source',
      render: (s: string) => <Tag color={SOURCE_COLORS[s] || 'default'}>{SOURCE_LABELS[s] || s}</Tag>,
    },
    { title: 'Гость', dataIndex: 'guestName', key: 'guestName' },
    { title: 'Телефон', dataIndex: 'guestPhone', key: 'guestPhone' },
    {
      title: 'Дата',
      dataIndex: 'startTime',
      key: 'date',
      render: (t: string) => dayjs(t).format('DD.MM.YYYY'),
    },
    {
      title: 'Время',
      key: 'time',
      render: (_: any, r: any) => `${dayjs(r.startTime).format('HH:mm')} – ${dayjs(r.endTime).format('HH:mm')}`,
    },
    { title: 'Гостей', dataIndex: 'guestCount', key: 'guestCount', width: 80 },
    {
      title: 'Сумма',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (p: number) => `${new Intl.NumberFormat('ru-RU').format(p)} ₽`,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, r: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => { setSelectedBooking(r); setShowForm(true); }}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Бронирования</Title>
        <Space>
          <Select
            allowClear
            placeholder="Статус"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Select
            allowClear
            placeholder="Источник"
            style={{ width: 140 }}
            value={sourceFilter}
            onChange={setSourceFilter}
            options={Object.entries(SOURCE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
          <RangePicker
            value={dateRange as any}
            onChange={(v) => setDateRange(v as any)}
          />
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={bookings}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <BookingFormModal
        open={showForm}
        booking={selectedBooking}
        onClose={() => { setShowForm(false); setSelectedBooking(null); }}
        onSuccess={() => { setShowForm(false); setSelectedBooking(null); loadBookings(); }}
      />
    </div>
  );
}
