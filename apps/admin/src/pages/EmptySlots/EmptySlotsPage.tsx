import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, Typography, Badge, Empty, Divider, DatePicker, Button, Select } from 'antd';
import { CalendarOutlined, LeftOutlined, RightOutlined, PlusOutlined } from '@ant-design/icons';
import { getEmptySlots } from '../../api/client';
import { useBranchStore } from '../../stores/branch-store';
import dayjs, { Dayjs } from 'dayjs';
import BookingFormModal from '../../components/BookingForm/BookingFormModal';

const { Title, Text } = Typography;

const categoryLabels: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
  common: 'Общий зал',
};

const categoryOptions = [
  { value: '', label: 'Все залы' },
  { value: 'bratski', label: 'По-братски' },
  { value: 'vibe', label: 'Вайб' },
  { value: 'flex', label: 'Флекс' },
  { value: 'full_gas', label: 'Полный газ' },
  { value: 'common', label: 'Общий зал' },
];

interface EmptySlot {
  roomName: string;
  roomId?: number;
  category: string;
  branchName: string;
  branchId: number;
  date: string;
  timeFrom: string;
  timeTo: string;
  pricePerHour: number;
  totalPrice: number;
}

export default function EmptySlotsPage() {
  const [slots, setSlots] = useState<EmptySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [prefill, setPrefill] = useState<{ roomId?: number; date?: Dayjs; timeFrom?: Dayjs; timeTo?: Dayjs } | undefined>();
  const { selectedBranchId } = useBranchStore();

  const loadSlots = useCallback(() => {
    setLoading(true);
    const params: { date?: string; branchId?: number; category?: string } = {};
    if (filterDate) params.date = filterDate.format('YYYY-MM-DD');
    if (selectedBranchId) params.branchId = selectedBranchId;
    if (filterCategory) params.category = filterCategory;
    getEmptySlots(params)
      .then(({ data }) => { setSlots(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filterDate, selectedBranchId, filterCategory]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const formatDate = (iso: string) => dayjs(iso).format('dd, D MMM.');
  const catLabel = (cat: string) => categoryLabels[cat] || cat;
  const formatPrice = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

  const handleBookSlot = (slot: EmptySlot) => {
    const slotDate = dayjs(slot.date);
    const [fromH, fromM] = slot.timeFrom.split(':').map(Number);
    const [toH, toM] = slot.timeTo.split(':').map(Number);
    setPrefill({
      roomId: slot.roomId,
      date: slotDate,
      timeFrom: slotDate.hour(fromH).minute(fromM),
      timeTo: slotDate.hour(toH).minute(toM),
    });
    setShowForm(true);
  };

  // Group by branch
  const grouped = useMemo(() => {
    const map = new Map<string, EmptySlot[]>();
    for (const s of slots) {
      const key = s.branchName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Свободные слоты</Title>

      <Card loading={loading}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ fontSize: 20, color: '#52c41a' }} />
            <Text strong style={{ fontSize: 18 }}>Свободные слоты</Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              options={categoryOptions}
              style={{ width: 150 }}
              size="small"
            />
            <Button
              size="small"
              icon={<LeftOutlined />}
              onClick={() => setFilterDate(d => (d || dayjs()).subtract(1, 'day'))}
            />
            <DatePicker
              value={filterDate}
              onChange={(d) => setFilterDate(d)}
              placeholder="Все даты"
              allowClear
              style={{ width: 160 }}
            />
            <Button
              size="small"
              icon={<RightOutlined />}
              onClick={() => setFilterDate(d => (d || dayjs()).add(1, 'day'))}
            />
            <Badge
              count={`${slots.length} слотов`}
              style={{ backgroundColor: '#F6FFED', color: '#389e0d', fontWeight: 500, fontSize: 13, marginLeft: 8 }}
            />
          </div>
        </div>

        {slots.length === 0 && !loading && (
          <Empty description="Нет свободных слотов" />
        )}

        {grouped.map(([branchName, branchSlots], gi) => (
          <div key={branchName}>
            {gi > 0 && <Divider style={{ margin: '16px 0' }} />}
            <div style={{
              padding: '8px 16px',
              marginBottom: 8,
              backgroundColor: '#FFF5F3',
              borderRadius: 6,
              borderLeft: '3px solid #E36FA8',
            }}>
              <Text strong style={{ fontSize: 15, color: '#E36FA8' }}>{branchName}</Text>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                {branchSlots.length} {branchSlots.length === 1 ? 'слот' : branchSlots.length < 5 ? 'слота' : 'слотов'}
              </Text>
            </div>

            {branchSlots.map((slot, idx) => (
              <div
                key={idx}
                style={{
                  borderLeft: '3px solid #B7EB8F',
                  padding: '14px 20px',
                  borderBottom: idx < branchSlots.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 15 }}>{slot.roomName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 13 }}>{catLabel(slot.category)}</Text>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 120 }}>
                    <Text strong style={{ fontSize: 14 }}>{formatDate(slot.date)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 14 }}>{slot.timeFrom} – {slot.timeTo}</Text>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                    <Text strong style={{ fontSize: 15, color: '#E36FA8' }}>
                      {formatPrice(slot.totalPrice)} ₽
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatPrice(slot.pricePerHour)} ₽/ч
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    style={{ marginLeft: 16, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                    onClick={() => handleBookSlot(slot)}
                  >
                    Забронировать
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </Card>

      <BookingFormModal
        open={showForm}
        prefill={prefill}
        onClose={() => setShowForm(false)}
        onSuccess={() => { setShowForm(false); loadSlots(); }}
      />
    </div>
  );
}
