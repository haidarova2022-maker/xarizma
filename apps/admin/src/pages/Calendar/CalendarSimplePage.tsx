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
  new: '#2196F3',
  awaiting_payment: '#FF9800',
  partially_paid: '#FFC107',
  fully_paid: '#4CAF50',
  walkin: '#00BCD4',
  completed: '#9C27B0',
  cancelled: '#EF9A9A',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  awaiting_payment: 'Ожидает оплаты',
  partially_paid: 'Частичная оплата',
  fully_paid: 'Оплачена',
  walkin: 'Walk-in',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

const GRID_START_HOUR = 9;
const GRID_TOTAL = 36;
const CELL_W = 40;
const ROOM_COL = 120;
const LANE_HEIGHT = 44;

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

/** Assign non-overlapping lanes to bookings */
function assignLanes(overlays: any[]): { maxLane: number; items: any[] } {
  const sorted = [...overlays].sort((a, b) => a.gridFrom - b.gridFrom);
  const laneEnds: number[] = [];
  const items = sorted.map(b => {
    let lane = laneEnds.findIndex(end => end <= b.gridFrom);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = b.gridTo;
    return { ...b, lane };
  });
  return { maxLane: laneEnds.length, items };
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
    if (selectedBranchId === null) return;
    setLoading(true);
    try {
      const dateFrom = date.hour(GRID_START_HOUR).minute(0).second(0).toISOString();
      const tomorrowHoursCount = GRID_TOTAL - todayHoursCount;
      const dateTo = nextDay.hour(GRID_START_HOUR - 1 + tomorrowHoursCount).minute(59).second(59).toISOString();
      const [calRes, roomsRes, pricingRes] = await Promise.all([
        getCalendar(selectedBranchId || undefined, dateFrom, dateTo),
        getRooms(selectedBranchId || undefined),
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

  const handleCellClick = useCallback((roomId: number | null, gridIdx: number, booking?: any) => {
    if (booking) {
      setPrefill(undefined);
      setSelectedBooking(booking);
    } else if (roomId) {
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

  const dayjsToGrid = useCallback((dt: Dayjs): number => {
    const isNextDay = dt.isAfter(date.endOf('day'));
    const h = dt.hour() + dt.minute() / 60;
    if (isNextDay) {
      return todayHoursCount + (h - GRID_START_HOUR + 24) % 24;
    }
    return h - GRID_START_HOUR;
  }, [date, todayHoursCount]);

  const noRoomBookings = useMemo(() => bookings.filter((b: any) => !b.roomId), [bookings]);

  const getOverlays = useCallback((roomId: number | null) => {
    return bookings
      .filter((b: any) => roomId === null ? !b.roomId : b.roomId === roomId)
      .map((b: any) => {
        const bStart = dayjs(b.startTime);
        const bEnd = dayjs(b.endTime);
        let gridFrom = dayjsToGrid(bStart);
        let gridTo = dayjsToGrid(bEnd);
        if (gridTo <= 0 || gridFrom >= GRID_TOTAL) return null;
        gridFrom = Math.max(0, gridFrom);
        gridTo = Math.min(GRID_TOTAL, gridTo);
        return { ...b, gridFrom, gridTo };
      })
      .filter(Boolean);
  }, [bookings, dayjsToGrid]);

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

  // Compute lanes for "Без зала" row
  const noRoomOverlays = useMemo(() => getOverlays(null), [getOverlays]);
  const { maxLane: noRoomLanes, items: noRoomLaned } = useMemo(() => assignLanes(noRoomOverlays), [noRoomOverlays]);

  /** Render a booking overlay block */
  const renderBooking = (b: any, laneOffset = 0, totalLanes = 1) => {
    const left = b.gridFrom * CELL_W + 2;
    const width = (b.gridTo - b.gridFrom) * CELL_W - 4;
    const bStart = dayjs(b.startTime);
    const bEnd = dayjs(b.endTime);
    const top = laneOffset * LANE_HEIGHT + 2;
    const height = LANE_HEIGHT - 4;
    return (
      <div
        key={b.id}
        onClick={() => handleCellClick(b.roomId || null, Math.floor(b.gridFrom), b)}
        title={`${b.guestName || '—'} | ${bStart.format('HH:mm')}–${bEnd.format('HH:mm')} | ${STATUS_LABELS[b.status] || b.status} | ${b.guestCount || '?'} чел. | ${b.totalPrice ? (b.totalPrice / 1000).toFixed(1) + 'k' : '—'}`}
        style={{
          position: 'absolute',
          left,
          width: Math.max(width, 30),
          top,
          height,
          borderRadius: 6,
          backgroundColor: STATUS_COLORS[b.status] || '#ddd',
          border: '1px solid rgba(0,0,0,0.15)',
          cursor: 'pointer',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '0 3px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: '14px', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
          {b.guestName?.split(' ')[0] || '—'}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', lineHeight: '12px', whiteSpace: 'nowrap', textShadow: '0 1px 1px rgba(0,0,0,0.2)' }}>
          {bStart.format('HH:mm')}–{bEnd.format('HH:mm')}
        </span>
        {width > 80 && (
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', lineHeight: '10px' }}>
            {b.guestCount || '?'} чел.
          </span>
        )}
      </div>
    );
  };

  const gridWidth = GRID_TOTAL * CELL_W + ROOM_COL;

  return (
    <div>
      {/* Branch tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
        <div onClick={() => selectBranch(0)} style={{
          padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14,
          backgroundColor: selectedBranchId === 0 ? '#E36FA8' : '#fff', color: selectedBranchId === 0 ? '#fff' : '#333',
          border: selectedBranchId === 0 ? '2px solid #E36FA8' : '2px solid #e8e8e8', transition: 'all 0.2s',
        }}>
          Все
        </div>
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
        <Title level={4} style={{ margin: 0 }}>{selectedBranchId === 0 ? 'Все филиалы' : branchShortName}</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Button size="small" icon={<LeftOutlined />} onClick={() => setDate(d => d.subtract(1, 'day'))} />
          <span style={{ fontWeight: 500, fontSize: 14, minWidth: 100, textAlign: 'center' }}>
            {date.format('dd, D MMM')}
          </span>
          <Button size="small" icon={<RightOutlined />} onClick={() => setDate(d => d.add(1, 'day'))} />
          <Button size="small" onClick={() => setDate(dayjs().startOf('day'))} style={{ marginLeft: 8 }}>
            Сегодня
          </Button>
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

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'cancelled').map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: STATUS_COLORS[key] }} />
            <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      ) : rooms.length === 0 && noRoomBookings.length === 0 ? (
        <Empty description="Нет залов и бронирований для выбранного филиала" />
      ) : (
        /* Scrollable calendar container — headers stick inside it */
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)', border: '1px solid #e8e8e8', borderRadius: 8 }}>
          <div style={{ minWidth: gridWidth }}>
            {/* Date row — sticky */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 12, backgroundColor: '#fff' }}>
              <div style={{ width: ROOM_COL, flexShrink: 0, position: 'sticky', left: 0, zIndex: 13, backgroundColor: '#fff' }} />
              <div style={{
                width: todayHoursCount * CELL_W, flexShrink: 0, textAlign: 'center', padding: '4px 0',
                fontWeight: 600, fontSize: 13, color: '#333', backgroundColor: '#F9F8FF',
                borderBottom: '2px solid #E36FA8',
              }}>
                {date.format('dd, D MMMM')}
              </div>
              <div style={{
                width: (GRID_TOTAL - todayHoursCount) * CELL_W, flexShrink: 0, textAlign: 'center', padding: '4px 0',
                fontWeight: 600, fontSize: 13, color: '#666', backgroundColor: '#FAFAFA',
                borderBottom: '2px solid #d9d9d9',
              }}>
                {nextDay.format('dd, D MMMM')}
              </div>
            </div>

            {/* Hours row — sticky below date */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', position: 'sticky', top: 26, zIndex: 12, backgroundColor: '#fff' }}>
              <div style={{ width: ROOM_COL, flexShrink: 0, padding: '6px 8px', fontSize: 11, color: '#8c8c8c', fontWeight: 500, position: 'sticky', left: 0, zIndex: 13, backgroundColor: '#fff' }}>
                Зал
              </div>
              {gridIndices.map(gi => {
                const closed = isCellClosed(gi);
                return (
                  <div key={gi} style={{
                    width: CELL_W, flexShrink: 0, textAlign: 'center', padding: '6px 0',
                    fontSize: 10, color: closed ? '#d9d9d9' : '#8c8c8c', fontWeight: 500,
                    borderLeft: gi === todayHoursCount ? '2px solid #d9d9d9' : 'none',
                    backgroundColor: closed ? '#fafafa' : '#fff',
                  }}>
                    {String(gridToHour(gi)).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* === "Без зала" rows at the TOP === */}
            {noRoomBookings.length > 0 && (
              <div style={{ display: 'flex', borderBottom: '2px solid #E36FA8', alignItems: 'stretch', backgroundColor: '#FFF7E6' }}>
                <div style={{
                  width: ROOM_COL, flexShrink: 0, padding: '8px 8px', borderRight: '1px solid #f0f0f0',
                  position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#FFF7E6',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, lineHeight: '16px', color: '#ad6800' }}>Бронирования</div>
                  <div style={{ color: '#ad6800', fontSize: 11, marginTop: 2 }}>{noRoomBookings.length} на день</div>
                  <div style={{ color: '#d48806', fontSize: 10, marginTop: 2 }}>Зал не назначен</div>
                </div>
                <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: Math.max(1, noRoomLanes) * LANE_HEIGHT }}>
                  {/* Background grid */}
                  {gridIndices.map(gi => (
                    <div key={gi} style={{
                      width: CELL_W, flexShrink: 0,
                      borderLeft: gi === todayHoursCount ? '2px solid #d9d9d9' : 'none',
                      backgroundColor: gi % 2 === 0 ? '#FFFBE6' : '#FFF7E6',
                    }} />
                  ))}
                  {/* Booking overlays with lanes */}
                  {noRoomLaned.map((b: any) => renderBooking(b, b.lane, noRoomLanes))}
                </div>
              </div>
            )}

            {/* Room rows */}
            {rooms.map((room: any) => {
              const overlays = getOverlays(room.id);
              const { maxLane, items: lanedItems } = assignLanes(overlays);
              return (
                <div key={room.id} style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', alignItems: 'stretch' }}>
                  <div style={{ width: ROOM_COL, flexShrink: 0, padding: '8px 8px', borderRight: '1px solid #f0f0f0', position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#fff' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, lineHeight: '16px' }}>{room.name}</div>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#E36FA8', lineHeight: '14px' }}>
                      {CATEGORY_LABELS[room.category] || room.category}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 10, marginTop: 2 }}>до {room.capacityMax} чел.</div>
                  </div>

                  <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: Math.max(1, maxLane) * LANE_HEIGHT }}>
                    {/* Background cells (prices, closed) */}
                    {gridIndices.map(gi => {
                      const price = getPrice(room.category, gi);
                      const isMidnight = gi === todayHoursCount;
                      const closed = isCellClosed(gi);

                      return (
                        <div key={gi} onClick={() => !closed && handleCellClick(room.id, gi)} style={{
                          width: CELL_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 2px', cursor: closed ? 'default' : 'pointer',
                          borderLeft: isMidnight ? '2px solid #d9d9d9' : 'none',
                        }}>
                          <div style={{
                            width: '100%', height: '100%', borderRadius: 4, minHeight: 36,
                            backgroundColor: closed ? '#f5f5f5' : '#F0FFF0',
                            border: closed ? '1px solid #e8e8e8' : '1px solid #C8E6C9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 500,
                            color: closed ? '#d9d9d9' : '#555',
                          }}>
                            {closed ? '' : `${(price / 1000).toFixed(1)}k`}
                          </div>
                        </div>
                      );
                    })}

                    {/* Booking overlays with lanes */}
                    {lanedItems.map((b: any) => renderBooking(b, b.lane, maxLane))}
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
        prefill={prefill}
        onClose={() => setShowForm(false)}
        onSuccess={onBookingCreated}
      />
    </div>
  );
}
