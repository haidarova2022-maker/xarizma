import { useEffect, useState, useMemo } from 'react';
import { Typography, DatePicker, Button, Tag, Tooltip, Modal, Spin, Empty } from 'antd';
import { PlusOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getCalendar, getRooms } from '../../api/client';
import BookingFormModal from '../../components/BookingForm/BookingFormModal';

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  new: '#FFE082',
  awaiting_payment: '#FFCC80',
  partially_paid: '#A5D6A7',
  fully_paid: '#4CAF50',
  walkin: '#CE93D8',
  completed: '#81C784',
  cancelled: '#EF9A9A',
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
  const { selectedBranchId } = useBranchStore();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const loadData = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const dateFrom = date.startOf('day').toISOString();
      const dateTo = date.add(1, 'day').endOf('day').toISOString();
      const [calRes, roomsRes] = await Promise.all([
        getCalendar(selectedBranchId, dateFrom, dateTo),
        getRooms(selectedBranchId),
      ]);
      setBookings(calRes.data);
      setRooms(roomsRes.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedBranchId, date]);

  const onBookingCreated = () => {
    setShowForm(false);
    loadData();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Календарь бронирований</Title>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button icon={<LeftOutlined />} onClick={() => setDate(d => d.subtract(1, 'day'))} />
          <DatePicker value={date} onChange={(d) => d && setDate(d)} />
          <Button icon={<RightOutlined />} onClick={() => setDate(d => d.add(1, 'day'))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedBooking(null); setShowForm(true); }}>
            Новая бронь
          </Button>
        </div>
      </div>

      {/* Status legend */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Tag key={key} color={STATUS_COLORS[key]} style={{ color: '#333' }}>{label}</Tag>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      ) : rooms.length === 0 ? (
        <Empty description="Нет залов для выбранного филиала" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1200 }}>
            {/* Header row with hours */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8' }}>
              <div style={{ width: 140, flexShrink: 0, padding: '8px 12px', fontWeight: 600, borderRight: '1px solid #e8e8e8' }}>
                Зал
              </div>
              {HOURS.map(h => (
                <div key={h} style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px 0',
                  fontSize: 12,
                  color: '#666',
                  borderRight: '1px solid #f0f0f0',
                  minWidth: 40,
                }}>
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Room rows */}
            {rooms.map((room: any) => {
              const roomBookings = bookings.filter((b: any) => b.roomId === room.id);
              return (
                <div key={room.id} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', position: 'relative', height: 48 }}>
                  <div style={{
                    width: 140, flexShrink: 0,
                    padding: '8px 12px',
                    borderRight: '1px solid #e8e8e8',
                    display: 'flex', alignItems: 'center',
                    fontSize: 13, fontWeight: 500,
                  }}>
                    {room.name}
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {/* Hour grid lines */}
                    {HOURS.map(h => (
                      <div key={h} style={{
                        position: 'absolute',
                        left: `${(h / 24) * 100}%`,
                        top: 0, bottom: 0,
                        borderLeft: '1px solid #f5f5f5',
                      }} />
                    ))}

                    {/* Booking blocks */}
                    {roomBookings.map((b: any) => {
                      const bStart = dayjs(b.startTime);
                      const bEnd = dayjs(b.endTime);
                      const dayStart = date.startOf('day');
                      const startHour = Math.max(0, bStart.diff(dayStart, 'minute') / 60);
                      const endHour = Math.min(24, bEnd.diff(dayStart, 'minute') / 60);
                      const left = (startHour / 24) * 100;
                      const width = ((endHour - startHour) / 24) * 100;

                      if (width <= 0) return null;

                      return (
                        <Tooltip
                          key={b.id}
                          title={`${b.guestName} | ${bStart.format('HH:mm')}–${bEnd.format('HH:mm')} | ${b.guestCount} гостей | ${new Intl.NumberFormat('ru-RU').format(b.totalPrice)} ₽`}
                        >
                          <div
                            onClick={() => { setSelectedBooking(b); setShowForm(true); }}
                            style={{
                              position: 'absolute',
                              left: `${left}%`,
                              width: `${width}%`,
                              top: 4,
                              bottom: 4,
                              backgroundColor: STATUS_COLORS[b.status] || '#ddd',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 6px',
                              fontSize: 11,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                          >
                            {b.guestName}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BookingFormModal
        open={showForm}
        booking={selectedBooking}
        onClose={() => setShowForm(false)}
        onSuccess={onBookingCreated}
      />
    </div>
  );
}
