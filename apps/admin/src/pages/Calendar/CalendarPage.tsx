import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Typography, Spin, Empty, message, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getCalendar, getRooms, getPricing, getSlotConfig } from '../../api/client';
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
const HALF_CELL = CELL_W / 2;
const ROOM_COL = 100;

interface SlotDef { from: number; to: number; }
interface RoomSlots { [roomId: number]: SlotDef[]; }
interface SlotConfig { startHour: number; slotDuration: number; gapHours: number; }

function generateSlots(cfg: SlotConfig): SlotDef[] {
  const slots: SlotDef[] = [];
  const step = cfg.slotDuration + cfg.gapHours;
  const gridStart = cfg.startHour - GRID_START_HOUR;
  for (let i = 0; i < 10; i++) {
    const from = gridStart + i * step;
    const to = from + cfg.slotDuration;
    if (from < 0) continue;
    if (from >= GRID_TOTAL) break;
    slots.push({ from, to: Math.min(to, GRID_TOTAL) });
  }
  return slots;
}

function gridToHour(grid: number): number {
  return (GRID_START_HOUR + grid) % 24;
}

function gridToTime(grid: number): string {
  const h = gridToHour(grid);
  const frac = grid % 1;
  const m = Math.round(frac * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDayType(date: Dayjs, hour: number): string {
  const dow = date.day();
  if (dow === 0) return 'sunday';
  if (dow === 6) return 'saturday';
  if (dow === 5) return hour < 17 ? 'friday_day' : 'friday_evening';
  return hour < 17 ? 'weekday_day' : 'weekday_evening';
}

// Conflict = only direct overlap of slot bodies (gaps are ok to overlap)
function hasSlotOverlap(slots: SlotDef[], index: number, candidate: SlotDef): boolean {
  for (let i = 0; i < slots.length; i++) {
    if (i === index) continue;
    const other = slots[i];
    if (candidate.from < other.to && candidate.to > other.from) return true;
  }
  return false;
}

// Draggable + resizable slot frame
function SlotFrame({ slot, index, roomId, allSlots, onMove, onResize, onSlotClick }: {
  slot: SlotDef;
  index: number;
  roomId: number;
  allSlots: SlotDef[];
  onMove: (roomId: number, index: number, newSlot: SlotDef) => void;
  onResize: (roomId: number, index: number, newSlot: SlotDef) => void;
  onSlotClick?: (roomId: number, slot: SlotDef) => void;
}) {
  const moveRef = useRef<{ startX: number; origFrom: number; origTo: number } | null>(null);
  const resizeRef = useRef<{ startX: number; origTo: number; edge: 'left' | 'right' } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [conflict, setConflict] = useState(false);

  const left = slot.from * CELL_W;
  const width = (slot.to - slot.from) * CELL_W;

  // --- MOVE (grab body) ---
  const onMoveStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    moveRef.current = { startX: e.clientX, origFrom: slot.from, origTo: slot.to };
    setDragging(true);
    setConflict(false);
    let moved = false;

    const onMouseMove = (ev: MouseEvent) => {
      if (!moveRef.current) return;
      const dx = Math.abs(ev.clientX - moveRef.current.startX);
      if (dx > 5) moved = true;
      const steps = Math.round((ev.clientX - moveRef.current.startX) / HALF_CELL);
      const offset = steps * 0.5;
      const newFrom = moveRef.current.origFrom + offset;
      const newTo = moveRef.current.origTo + offset;
      if (newFrom >= 0 && newTo <= GRID_TOTAL && frameRef.current) {
        frameRef.current.style.left = `${newFrom * CELL_W}px`;
        const c = hasSlotOverlap(allSlots, index, { from: newFrom, to: newTo });
        setConflict(c);
        frameRef.current.style.borderColor = c ? '#ff4d4f' : '#E36FA8';
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (!moveRef.current) return;

      // Click (no drag) — open booking form
      if (!moved) {
        setDragging(false);
        setConflict(false);
        moveRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        onSlotClick?.(roomId, slot);
        return;
      }

      const steps = Math.round((ev.clientX - moveRef.current.startX) / HALF_CELL);
      const offset = steps * 0.5;
      const newFrom = moveRef.current.origFrom + offset;
      const newTo = moveRef.current.origTo + offset;

      if (newFrom >= 0 && newTo <= GRID_TOTAL) {
        if (hasSlotOverlap(allSlots, index, { from: newFrom, to: newTo })) {
          message.error('Конфликт: слот накладывается на другой слот');
          if (frameRef.current) {
            frameRef.current.style.left = `${slot.from * CELL_W}px`;
            frameRef.current.style.borderColor = '#E36FA8';
          }
        } else {
          onMove(roomId, index, { from: newFrom, to: newTo });
        }
      }

      setDragging(false);
      setConflict(false);
      moveRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [slot, roomId, index, allSlots, onMove, onSlotClick]);

  // --- RESIZE (grab edge) ---
  const onResizeStart = useCallback((edge: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, origTo: edge === 'right' ? slot.to : slot.from, edge };
    setDragging(true);
    setConflict(false);

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const steps = Math.round((ev.clientX - resizeRef.current.startX) / HALF_CELL);
      const offset = steps * 0.5;
      const newVal = resizeRef.current.origTo + offset;

      let candidate: SlotDef;
      if (resizeRef.current.edge === 'right') {
        candidate = { from: slot.from, to: newVal };
      } else {
        candidate = { from: newVal, to: slot.to };
      }

      if (candidate.from >= 0 && candidate.to <= GRID_TOTAL && candidate.to - candidate.from >= 1) {
        if (frameRef.current) {
          if (resizeRef.current.edge === 'right') {
            frameRef.current.style.width = `${(candidate.to - candidate.from) * CELL_W}px`;
          } else {
            frameRef.current.style.left = `${candidate.from * CELL_W}px`;
            frameRef.current.style.width = `${(candidate.to - candidate.from) * CELL_W}px`;
          }
          const c = hasSlotOverlap(allSlots, index, candidate);
          setConflict(c);
          frameRef.current.style.borderColor = c ? '#ff4d4f' : '#E36FA8';
        }
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const steps = Math.round((ev.clientX - resizeRef.current.startX) / HALF_CELL);
      const offset = steps * 0.5;
      const newVal = resizeRef.current.origTo + offset;

      let candidate: SlotDef;
      if (resizeRef.current.edge === 'right') {
        candidate = { from: slot.from, to: newVal };
      } else {
        candidate = { from: newVal, to: slot.to };
      }

      if (candidate.from >= 0 && candidate.to <= GRID_TOTAL && candidate.to - candidate.from >= 1) {
        if (hasSlotOverlap(allSlots, index, candidate)) {
          message.error('Конфликт: слот накладывается на другой слот');
          if (frameRef.current) {
            frameRef.current.style.left = `${slot.from * CELL_W}px`;
            frameRef.current.style.width = `${(slot.to - slot.from) * CELL_W}px`;
            frameRef.current.style.borderColor = '#E36FA8';
          }
        } else {
          onResize(roomId, index, candidate);
        }
      }

      setDragging(false);
      setConflict(false);
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [slot, roomId, index, allSlots, onResize]);

  const borderColor = conflict ? '#ff4d4f' : '#E36FA8';
  const bgTint = conflict ? 'rgba(255,77,79,0.06)' : dragging ? 'rgba(227,111,168,0.04)' : 'transparent';

  return (
    <div
      ref={frameRef}
      style={{
        position: 'absolute',
        left,
        width,
        top: 1,
        bottom: 1,
        border: `2px dashed ${borderColor}`,
        borderRadius: 6,
        zIndex: 3,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 1,
        backgroundColor: bgTint,
        transition: 'background-color 0.15s',
      }}
    >
      {/* Left resize handle */}
      <div
        onMouseDown={(e) => onResizeStart('left', e)}
        style={{
          position: 'absolute', left: -2, top: 0, bottom: 0, width: 8,
          cursor: 'ew-resize', zIndex: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: borderColor, opacity: 0.6 }} />
      </div>

      {/* Move body */}
      <div
        onMouseDown={onMoveStart}
        style={{
          position: 'absolute', left: 8, right: 8, top: 0, bottom: 0,
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      />

      {/* Right resize handle */}
      <div
        onMouseDown={(e) => onResizeStart('right', e)}
        style={{
          position: 'absolute', right: -2, top: 0, bottom: 0, width: 8,
          cursor: 'ew-resize', zIndex: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: borderColor, opacity: 0.6 }} />
      </div>

      {/* Time label */}
      <span style={{
        fontSize: 9,
        color: conflict ? '#ff4d4f' : '#E36FA8',
        fontWeight: 600,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: '0 3px',
        borderRadius: 2,
        lineHeight: '12px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        {gridToTime(slot.from)}–{gridToTime(slot.to)}
      </span>
    </div>
  );
}

export default function CalendarPage() {
  const { selectedBranchId, branches, selectBranch } = useBranchStore();
  const [date, setDate] = useState<Dayjs>(dayjs().startOf('day'));
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [prefill, setPrefill] = useState<{ roomId?: number; date?: Dayjs; timeFrom?: Dayjs; timeTo?: Dayjs } | undefined>();
  const [roomSlots, setRoomSlots] = useState<RoomSlots>({});
  const [slotCfg, setSlotCfg] = useState<SlotConfig>({ startHour: 9, slotDuration: 3, gapHours: 1 });

  const nextDay = useMemo(() => date.add(1, 'day'), [date]);
  const todayHoursCount = 24 - GRID_START_HOUR;

  const loadData = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const dateFrom = date.hour(GRID_START_HOUR).minute(0).second(0).toISOString();
      const tomorrowHoursCount = GRID_TOTAL - todayHoursCount;
      const dateTo = nextDay.hour(GRID_START_HOUR - 1 + tomorrowHoursCount).minute(59).second(59).toISOString();
      const [calRes, roomsRes, pricingRes, cfgRes] = await Promise.all([
        getCalendar(selectedBranchId, dateFrom, dateTo),
        getRooms(selectedBranchId),
        getPricing(),
        getSlotConfig(),
      ]);
      setBookings(calRes.data);
      setRooms(roomsRes.data);
      setPricing(pricingRes.data);

      const cfg: SlotConfig = cfgRes.data;
      setSlotCfg(cfg);
      const defaultSlots = generateSlots(cfg);

      const newSlots: RoomSlots = {};
      for (const r of roomsRes.data) {
        newSlots[r.id] = roomSlots[r.id] || defaultSlots.map(s => ({ ...s }));
      }
      setRoomSlots(newSlots);
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
    const frac = gridIdx % 1;
    const m = Math.round(frac * 60);
    return (isNextDay ? nextDay : date).hour(h).minute(m).second(0);
  }, [date, nextDay, todayHoursCount]);

  const handleSlotClick = useCallback((roomId: number, slot: SlotDef) => {
    setPrefill({
      roomId,
      date: gridToDayjs(slot.from),
      timeFrom: gridToDayjs(slot.from),
      timeTo: gridToDayjs(slot.to),
    });
    setSelectedBooking(null);
    setShowForm(true);
  }, [gridToDayjs]);

  const handleCellClick = useCallback((roomId: number, gridIdx: number) => {
    setPrefill({
      roomId,
      date: gridToDayjs(gridIdx),
      timeFrom: gridToDayjs(gridIdx),
      timeTo: gridToDayjs(gridIdx + slotCfg.slotDuration),
    });
    setSelectedBooking(null);
    setShowForm(true);
  }, [gridToDayjs, slotCfg.slotDuration]);

  const handleSlotChange = useCallback((roomId: number, idx: number, newSlot: SlotDef) => {
    setRoomSlots(prev => {
      const updated = { ...prev };
      updated[roomId] = [...(prev[roomId] || [])];
      updated[roomId][idx] = newSlot;
      return updated;
    });
    message.info(`Слот: ${gridToTime(newSlot.from)}–${gridToTime(newSlot.to)}`);
  }, []);

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

  const isGapCell = (roomId: number, gridIdx: number): boolean => {
    const slots = roomSlots[roomId] || [];
    for (const s of slots) {
      if (gridIdx >= s.from && gridIdx < s.to) return false;
    }
    const sorted = [...slots].sort((a, b) => a.from - b.from);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (gridIdx >= sorted[i].to && gridIdx < sorted[i + 1].from) return true;
    }
    return false;
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
            {rooms.map((room: any) => {
              const slots = roomSlots[room.id] || [];
              return (
                <div key={room.id} style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', alignItems: 'stretch' }}>
                  <div style={{ width: ROOM_COL, flexShrink: 0, padding: '8px 8px', borderRight: '1px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, lineHeight: '16px' }}>{room.name}</div>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#E36FA8', lineHeight: '14px' }}>
                      {CATEGORY_LABELS[room.category] || room.category}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 10, marginTop: 2 }}>до {room.capacityMax} чел.</div>
                  </div>

                  <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
                    {slots.map((slot, idx) => (
                      <SlotFrame
                        key={idx}
                        slot={slot}
                        index={idx}
                        roomId={room.id}
                        allSlots={slots}
                        onMove={handleSlotChange}
                        onResize={handleSlotChange}
                        onSlotClick={handleSlotClick}
                      />
                    ))}

                    {gridIndices.map(gi => {
                      const booking = getBookingForCell(room.id, gi);
                      const price = getPrice(room.category, gi);
                      const isMidnight = gi === todayHoursCount;
                      const gap = isGapCell(room.id, gi);
                      const closed = isCellClosed(gi);

                      if (closed) {
                        return (
                          <div key={gi} style={{
                            width: CELL_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '4px 2px', zIndex: 1,
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
                          <div key={gi} onClick={() => { setPrefill(undefined); setSelectedBooking(booking); setShowForm(true); }} style={{
                            width: CELL_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '4px 2px', cursor: 'pointer', zIndex: 1,
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
                          padding: '4px 2px', cursor: 'pointer', zIndex: 1,
                          borderLeft: isMidnight ? '2px solid #d9d9d9' : 'none',
                        }}>
                          <div style={{
                            width: '100%', height: '100%', borderRadius: 4, minHeight: 36,
                            backgroundColor: gap ? '#FFF8E1' : '#F0FFF0',
                            border: gap ? '1px dashed #FFD54F' : '1px solid #C8E6C9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: gap ? 8 : 10, fontWeight: 500,
                            color: gap ? '#BF8F00' : '#555',
                          }}>
                            {gap ? 'gap' : `${(price / 1000).toFixed(1)}k`}
                          </div>
                        </div>
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
        prefill={prefill}
        onClose={() => setShowForm(false)}
        onSuccess={onBookingCreated}
      />
    </div>
  );
}
