import { useEffect, useState, useMemo, useCallback } from 'react';
import { Typography, Spin, Empty, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getCalendar, getRooms, getPricing } from '../../api/client';
import { isHourOpen, isDayFullyClosed } from '../../utils/working-hours';
import BookingFormModal from '../../components/BookingForm/BookingFormModal';

const { Title } = Typography;

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#FFE082',
  awaiting_payment: '#FFCC80',
  partially_paid: '#A5D6A7',
  fully_paid: '#4CAF50',
  walkin: '#CE93D8',
  completed: '#81C784',
  cancelled: '#EF9A9A',
};

const GRID_START_HOUR = 9;
const GRID_TOTAL = 36;
const CELL_W = 40;
const ROOM_COL = 100;

function gridToHour(grid: number): number {
  return (GRID_START_HOUR + grid) % 24;
}

function getDayType(date: Dayjs, hour: number): string {
  const dow = date.day();
  if (dow === 0) return 'sunday';
  if (dow === 6) return 'saturday';
  if (dow === 5) return hour < 17 ? 'friday_day' : 'friday_evening';
  return hour < 17 ? 'weekday_day' : 'weekday_evening';
}

export default function CalendarSimplePage() {
  const { selectedBranchId, branches, selectBranch } = useBranchStore();
  const [date, setDate] = useState<Dayjs>(dayjs().startOf('day'));
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [prefill, setPrefill] = useState<{ roomId?: number; date?: Dayjs; timeFrom?: Dayjs; timeTo?: Dayjs } | undefined>();

  const nextDay = useMemo(() => date.add(1, 'day'), [date]);
  const todayHoursCount = 24 - GRID_START_HOUR;

  const loadData = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const dateFrom = date.hour(GRID_START_HOUR).minute(0).second(0).toISOString();
      const tomorrowHoursCount = GRID_TOTAL - todayHoursCount;
      const dateTo = nextDay.hour(GRID_START_HOUR - 1 + tomorrowHoursCount).minute(59).second(59).toISOString();
      const [calRes, roomsRes, pricingRes] = await Promise.all([
        getCalendar(selectedBranchId, dateFrom, dateTo),
        getRooms(selectedBranchId),
        getPricing(),
      ]);
      setBookings(calRes.data);
      setRooms(roomsRes.data);
      setPricing(pricingRes.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedBranchId, date]);

  const onBookingCreated = () => { setShowForm(false); loadData(); };

  const gridToDayjs = useCallback((gridIdx: number): Dayjs => {
    const isNextDay = gridIdx >= todayHoursCount;
    const h = gridToHour(gridIdx);
    return (isNextDay ? nextDay : date).hour(h).minute(0).second(0);
  }, [date, nextDay, todayHoursCount]);

  const handleCellClick = useCallback((roomId: number, gridIdx: number, booking?: any) => {
    if (booking) {
      setPrefill(undefined);
      setSelectedBooking(booking);
    } else {
      setPrefill({
        roomId,
        date: gridToDayjs(gridIdx),
        timeFrom: gridToDayjs(gridIdx),
        timeTo: gridToDayjs(gridIdx + 3),
      });
      setSelectedBooking(null);
    }
    setShowForm(true);
  }, [gridToDayjs]);

  const branch = branches.find((b: any) => b.id === selectedBranchId);
  const branchShortName = branch?.name?.replace(/^Харизма\s+/, '') || '';

  const getPrice = (category: string, gridIdx: number) => {
    const realHour = gridToHour(gridIdx);
    const isNextDay = gridIdx >= todayHoursCount;
    const dt = getDayType(isNextDay ? nextDay : date, realHour);
    const rule = pricing.find((r: any) => r.category === category && r.dayType === dt);
    return rule?.pricePerHour || 0;
  };

  const getBookingForCell = (roomId: number, gridIdx: number) => {
    const realHour = gridToHour(gridIdx);
    const isNextDay = gridIdx >= todayHoursCount;
    const cellDay = isNextDay ? nextDay : date;
    const cellStart = cellDay.hour(realHour).minute(0).second(0);
    const cellEnd = cellStart.add(1, 'hour');
    return bookings.find((b: any) => {
      if (b.roomId !== roomId) return false;
      const bStart = dayjs(b.startTime);
      const bEnd = dayjs(b.endTime);
      return bStart.isBefore(cellEnd) && bEnd.isAfter(cellStart);
    });
  };

  const gridIndices = Array.from({ length: GRID_TOTAL }, (_, i) => i);

  const isCellClosed = useCallback((gi: number): boolean => {
    if (!branch?.workingHours) return false;
    const realHour = gridToHour(gi);
    const isNextDay = gi >= todayHoursCount;
    const cellDay = isNextDay ? nextDay : date;
    return !isHourOpen(branch.workingHours, cellDay, realHour);
  }, [branch, date, nextDay, todayHoursCount]);

  const todayIsDayOff = branch?.workingHours
    ? isDayFullyClosed(branch.workingHours, date, GRID_START_HOUR, 23)
    : false;

  return (
    <div>
      {/* Branch tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
        {branches.map((b: any) => {
          const shortName = b.name.replace(/^Харизма\s+/, '');
          const isActive = b.id === selectedBranchId;
          return (
            <div key={b.id} onClick={() => selectBranch(b.id)} style={{
              padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14,
              backgroundColor: isActive ? '#E36FA8' : '#fff', color: isActive ? '#fff' : '#333',
              border: isActive ? '2px solid #E36FA8' : '2px solid #e8e8e8', transition: 'all 0.2s',
            }}>
              {shortName}
            </div>
          );
        })}
      </div>

      {/* Title + date nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{branchShortName}</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Button size="small" icon={<LeftOutlined />} onClick={() => setDate(d => d.subtract(1, 'day'))} />
          <span style={{ fontWeight: 500, fontSize: 14, minWidth: 100, textAlign: 'center' }}>
            {date.format('dd, D MMM')}
          </span>
          <Button size="small" icon={<RightOutlined />} onClick={() => setDate(d => d.add(1, 'day'))} />
        </div>
      </div>

      {todayIsDayOff && !loading && (
        <div style={{
          padding: '12px 20px', marginBottom: 12, borderRadius: 8,
          backgroundColor: '#fff2e8', border: '1px solid #ffd8bf',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>&#128164;</span>
          <span style={{ fontWeight: 600, color: '#ad4e00' }}>
            Выходной — филиал не работает {date.format('dd, D MMMM')}
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      ) : rooms.length === 0 ? (
        <Empty description="Нет залов для выбранного филиала" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: GRID_TOTAL * CELL_W + ROOM_COL }}>
            {/* Date row */}
            <div style={{ display: 'flex' }}>
              <div style={{ width: ROOM_COL, flexShrink: 0 }} />
              <div style={{
                width: todayHoursCount * CELL_W, flexShrink: 0, textAlign: 'center', padding: '4px 0',
                fontWeight: 600, fontSize: 13, color: '#333', backgroundColor: '#F9F8FF',
                borderBottom: '2px solid #E36FA8', borderRadius: '6px 6px 0 0',
              }}>
                {date.format('dd, D MMMM')}
              </div>
              <div style={{
                width: (GRID_TOTAL - todayHoursCount) * CELL_W, flexShrink: 0, textAlign: 'center', padding: '4px 0',
                fontWeight: 600, fontSize: 13, color: '#666', backgroundColor: '#FAFAFA',
                borderBottom: '2px solid #d9d9d9', borderRadius: '6px 6px 0 0',
              }}>
                {nextDay.format('dd, D MMMM')}
              </div>
            </div>

            {/* Hours row */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8' }}>
              <div style={{ width: ROOM_COL, flexShrink: 0, padding: '6px 8px', fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>
                Зал
              </div>
              {gridIndices.map(gi => {
                const closed = isCellClosed(gi);
                return (
                  <div key={gi} style={{
                    width: CELL_W, flexShrink: 0, textAlign: 'center', padding: '6px 0',
                    fontSize: 10, color: closed ? '#d9d9d9' : '#8c8c8c', fontWeight: 500,
                    borderLeft: gi === todayHoursCount ? '2px solid #d9d9d9' : 'none',
                    backgroundColor: closed ? '#fafafa' : undefined,
                  }}>
                    {String(gridToHour(gi)).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* Room rows */}
            {rooms.map((room: any) => (
              <div key={room.id} style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', alignItems: 'stretch' }}>
                <div style={{ width: ROOM_COL, flexShrink: 0, padding: '8px 8px', borderRight: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, lineHeight: '16px' }}>{room.name}</div>
                  <div style={{ fontWeight: 600, fontSize: 11, color: '#E36FA8', lineHeight: '14px' }}>
                    {CATEGORY_LABELS[room.category] || room.category}
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 10, marginTop: 2 }}>до {room.capacityMax} чел.</div>
                </div>

                <div style={{ display: 'flex', flex: 1 }}>
                  {gridIndices.map(gi => {
                    const booking = getBookingForCell(room.id, gi);
                    const price = getPrice(room.category, gi);
                    const isMidnight = gi === todayHoursCount;
                    const closed = isCellClosed(gi);

                    if (closed) {
                      return (
                        <div key={gi} style={{
                          width: CELL_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 2px',
                          borderLeft: isMidnight ? '2px solid #d9d9d9' : 'none',
                        }}>
                          <div style={{
                            width: '100%', height: '100%', borderRadius: 4, minHeight: 36,
                            backgroundColor: '#f5f5f5', border: '1px solid #e8e8e8',
                          }} />
                        </div>
                      );
                    }

                    if (booking) {
                      return (
                        <div key={gi} onClick={() => handleCellClick(room.id, gi, booking)} style={{
                          width: CELL_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 2px', cursor: 'pointer',
                          borderLeft: isMidnight ? '2px solid #d9d9d9' : 'none',
                        }}>
                          <div style={{
                            width: '100%', height: '100%', borderRadius: 4, minHeight: 36,
                            backgroundColor: STATUS_COLORS[booking.status] || '#ddd',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 500, color: '#333', border: '1px solid rgba(0,0,0,0.08)',
                          }}>
                            {booking.guestName?.split(' ')[0]}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={gi} onClick={() => handleCellClick(room.id, gi)} style={{
                        width: CELL_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '4px 2px', cursor: 'pointer',
                        borderLeft: isMidnight ? '2px solid #d9d9d9' : 'none',
                      }}>
                        <div style={{
                          width: '100%', height: '100%', borderRadius: 4, minHeight: 36,
                          backgroundColor: '#F0FFF0', border: '1px solid #C8E6C9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 500, color: '#555',
                        }}>
                          {`${(price / 1000).toFixed(1)}k`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BookingFormModal
        open={showForm}
        booking={selectedBooking}
        prefill={prefill}
        onClose={() => setShowForm(false)}
        onSuccess={onBookingCreated}
      />
    </div>
  );
}
