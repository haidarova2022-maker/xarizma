import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, Typography, Badge, Empty, Divider, DatePicker, Button } from 'antd';
import { ExclamationCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { getEmptySlots } from '../../api/client';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;

const categoryLabels: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

interface EmptySlot {
  roomName: string;
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

  const loadSlots = useCallback((date?: Dayjs | null) => {
    setLoading(true);
    const dateStr = date ? date.format('YYYY-MM-DD') : undefined;
    getEmptySlots(dateStr)
      .then(({ data }) => { setSlots(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadSlots(filterDate); }, [filterDate, loadSlots]);

  const formatDate = (iso: string) => dayjs(iso).format('dd, D MMM.');
  const catLabel = (cat: string) => categoryLabels[cat] || cat;
  const formatPrice = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

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
      <Title level={3} style={{ marginBottom: 24 }}>Пустые окна</Title>

      <Card loading={loading}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExclamationCircleOutlined style={{ fontSize: 20, color: '#FDCB6E' }} />
            <Text strong style={{ fontSize: 18 }}>Пустые окна</Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              style={{ backgroundColor: '#FFF9E6', color: '#8B7300', fontWeight: 500, fontSize: 13, marginLeft: 8 }}
            />
          </div>
        </div>

        {slots.length === 0 && !loading && (
          <Empty description="Нет пустых окон" />
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
                  borderLeft: '3px solid #FDCB6E',
                  padding: '14px 20px',
                  borderBottom: idx < branchSlots.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 15 }}>{slot.roomName} {catLabel(slot.category)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 13 }}>{slot.branchName} · {catLabel(slot.category)}</Text>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 120 }}>
                    <Text strong style={{ fontSize: 14 }}>{formatDate(slot.date)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 14 }}>{slot.timeFrom} - {slot.timeTo}</Text>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <Text strong style={{ fontSize: 15, color: '#E36FA8' }}>
                      {formatPrice(slot.totalPrice)} ₽
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatPrice(slot.pricePerHour)} ₽/ч
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}
