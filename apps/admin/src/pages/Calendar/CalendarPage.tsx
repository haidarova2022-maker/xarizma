import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Typography, Spin, Empty, message, Button, Switch, DatePicker } from 'antd';
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
  common: 'Общий зал',
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

const LANE_HEIGHT = 44;

/** Assign non-overlapping lanes to bookings */
function assignLanes(overlays: any[]): { maxLane: number; items: any[] } {
  const sorted = [...overlays].sort((a, b) => a.gridFrom - b.gridFrom);
  const laneEnds: number[] = [];
  const items = sorted.map(b => {
    let lane = laneEnds.findIndex(end => end <= b.gridFrom);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = b.gridTo;
    return { ...b, lane };
  });
  return { maxLane: laneEnds.length, items };
}

const CELL_W = 40;
const HALF_CELL = CELL_W / 2;
const ROOM_COL = 100;

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** Compute grid start hour and total hours from branch schedule */
function getGridRange(branch: any, date: Dayjs): { startHour: number; totalHours: number } {
  if (!branch?.workingHours) return { startHour: 0, totalHours: 24 }; // "Все" — full day

  const dow = date.day();
  const schedule = branch.workingHours[DAY_KEYS[dow]];

  if (!schedule) {
    // Day off — check if previous day carries over
    const prevSchedule = branch.workingHours[DAY_KEYS[(dow + 6) % 7]];
    if (prevSchedule) {
      if (prevSchedule.is24h) return { startHour: 0, totalHours: 6 };
      const closeH = parseInt(prevSchedule.close.split(':')[0], 10);
      const openH = parseInt(prevSchedule.open.split(':')[0], 10);
      if (closeH < openH) return { startHour: 0, totalHours: closeH };
    }
    return { startHour: 14, totalHours: 16 };
  }

  if (schedule.is24h) {
    const openH = parseInt(schedule.open.split(':')[0], 10);
    if (openH === 0) return { startHour: 0, totalHours: 24 };
    // e.g. Friday from 14:00 running 24h → show 14:00 to 06:00 next day
    return { startHour: openH, totalHours: (24 - openH) + 6 };
  }

  const openH = parseInt(schedule.open.split(':')[0], 10);
  const closeH = parseInt(schedule.close.split(':')[0], 10);
  if (closeH <= openH) {
    // Overnight: 14:00-06:00
    return { startHour: openH, totalHours: (24 - openH) + closeH };
  }
  return { startHour: openH, totalHours: closeH - openH };
}

interface SlotDef { from: number; to: number; }
interface RoomSlots { [roomId: number]: SlotDef[]; }
interface SlotConfig { startHour: number; slotDuration: number; gapHours: number; }

function generateSlots(cfg: SlotConfig, gridStartHour: number, gridTotal: number): SlotDef[] {
  const slots: SlotDef[] = [];
  const step = cfg.slotDuration + cfg.gapHours;
  const gridStart = cfg.startHour - gridStartHour;
  for (let i = 0; i < 10; i++) {
    const from = gridStart + i * step;
    const to = from + cfg.slotDuration;
    if (from < 0) continue;
    if (from >= gridTotal) break;
    slots.push({ from, to: Math.min(to, gridTotal) });
  }
  return slots;
}

function makeGridToHour(gridStartHour: number) {
  return (grid: number): number => (gridStartHour + Math.floor(grid)) % 24;
}

function makeGridToTime(gridStartHour: number) {
  const toHour = makeGridToHour(gridStartHour);
  return (grid: number): string => {
    const h = toHour(grid);
    const frac = grid % 1;
    const m = Math.round(frac * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
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
function SlotFrame({ slot, index, roomId, allSlots, onMove, onResize, onSlotClick, gridTotal, gridToTimeFn }: {
  slot: SlotDef;
  index: number;
  roomId: number;
  allSlots: SlotDef[];
  onMove: (roomId: number, index: number, newSlot: SlotDef) => void;
  onResize: (roomId: number, index: number, newSlot: SlotDef) => void;
  onSlotClick?: (roomId: number, slot: SlotDef) => void;
  gridTotal: number;
  gridToTimeFn: (grid: number) => string;
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
      if (newFrom >= 0 && newTo <= gridTotal && frameRef.current) {
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

      if (newFrom >= 0 && newTo <= gridTotal) {
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

      if (candidate.from >= 0 && candidate.to <= gridTotal && candidate.to - candidate.from >= 1) {
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

      if (candidate.from >= 0 && candidate.to <= gridTotal && candidate.to - candidate.from >= 1) {
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
        border: `2px solid ${borderColor}`,
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
        {gridToTimeFn(slot.from)}–{gridToTimeFn(slot.to)}
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
  const [slotsVisible, setSlotsVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextDay = useMemo(() => date.add(1, 'day'), [date]);
  const branch = branches.find((b: any) => b.id === selectedBranchId);
  const branchShortName = branch?.name?.replace(/^Харизма\s+/, '') || '';

  // Fixed 2-day grid: 09:00 today → 21:00 tomorrow (36 hours)
  const gridStartHour = 9;
  const gridTotal = 36;
  const todayHoursCount = 24 - gridStartHour; // 15
  const gridToHour = useMemo(() => makeGridToHour(gridStartHour), []);
  const gridToTime = useMemo(() => makeGridToTime(gridStartHour), []);
  const gridIndices = useMemo(() => Array.from({ length: gridTotal }, (_, i) => i), []);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    if (selectedBranchId === null) return;
    setLoading(true);
    setLoadError(null);
    try {
      const dateFrom = date.hour(gridStartHour).minute(0).second(0).toISOString();
      const dateTo = nextDay.hour(20).minute(59).second(59).toISOString();
      console.log('[Calendar] Loading:', { selectedBranchId, dateFrom, dateTo });

      // Load each API independently so one failure doesn't break all
      let calData: any[] = [];
      let roomsData: any[] = [];
      let pricingData: any[] = [];
      let cfgData: SlotConfig = { startHour: 10, slotDuration: 2, gapHours: 0.25 };

      try {
        const calRes = await getCalendar(selectedBranchId || undefined, dateFrom, dateTo);
        calData = Array.isArray(calRes.data) ? calRes.data : [];
        console.log('[Calendar] Bookings loaded:', calData.length);
      } catch (e) {
        console.error('[Calendar] Failed to load bookings:', e);
        setLoadError(`Ошибка загрузки бронирований: ${e}`);
      }

      try {
        const roomsRes = await getRooms(selectedBranchId || undefined);
        roomsData = Array.isArray(roomsRes.data) ? roomsRes.data : [];
      } catch (e) {
        console.error('[Calendar] Failed to load rooms:', e);
      }

      try {
        const pricingRes = await getPricing();
        pricingData = Array.isArray(pricingRes.data) ? pricingRes.data : [];
      } catch (e) {
        console.error('[Calendar] Failed to load pricing:', e);
      }

      try {
        const cfgRes = await getSlotConfig();
        if (cfgRes.data) cfgData = cfgRes.data;
      } catch (e) {
        console.error('[Calendar] Failed to load slot config:', e);
      }

      setBookings(calData);
      setRooms(roomsData);
      setPricing(pricingData);
      setSlotCfg(cfgData);

      const defaultSlots = generateSlots(cfgData, gridStartHour, gridTotal);
      const newSlots: RoomSlots = {};
      for (const r of roomsData) {
        newSlots[r.id] = roomSlots[r.id] || defaultSlots.map(s => ({ ...s }));
      }
      setRoomSlots(newSlots);
    } catch (err) {
      console.error('[Calendar] loadData error:', err);
      setLoadError(`Ошибка: ${err}`);
      message.error('Ошибка загрузки данных календаря');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedBranchId, date]);

  // Auto-scroll to current time on data load
  useEffect(() => {
    if (!loading && bookings.length > 0 && scrollRef.current) {
      const now = dayjs();
      const h = now.hour() + now.minute() / 60;
      const gridPos = h - gridStartHour;
      if (gridPos >= 0 && gridPos < gridTotal) {
        const scrollLeft = Math.max(0, gridPos * CELL_W - 200);
        scrollRef.current.scrollLeft = scrollLeft;
      }
    }
  }, [loading, bookings.length]);

  const onBookingCreated = () => { setShowForm(false); loadData(); };

  const gridToDayjs = useCallback((gridIdx: number): Dayjs => {
    const isNextDay = gridIdx >= todayHoursCount;
    const h = gridToHour(gridIdx);
    const frac = gridIdx % 1;
    const m = Math.round(frac * 60);
    return (isNextDay ? nextDay : date).hour(h).minute(m).second(0);
  }, [date, nextDay, todayHoursCount, gridToHour]);

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
  }, [gridToTime]);

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

  // Convert a booking datetime to grid position (fractional hours from gridStartHour)
  const dayjsToGrid = useCallback((dt: Dayjs): number => {
    const isNextDay = dt.isAfter(date.endOf('day'));
    const h = dt.hour() + dt.minute() / 60;
    if (isNextDay) {
      return todayHoursCount + (h - gridStartHour + 24) % 24;
    }
    return h - gridStartHour;
  }, [date, todayHoursCount]);

  // Get all bookings for a room as positioned overlays
  const getRoomBookings = useCallback((roomId: number | null) => {
    return bookings
      .filter((b: any) => roomId === null ? !b.roomId : b.roomId === roomId)
      .map((b: any) => {
        const bStart = dayjs(b.startTime);
        const bEnd = dayjs(b.endTime);
        let gridFrom = dayjsToGrid(bStart);
        let gridTo = dayjsToGrid(bEnd);
        // Clamp to visible grid
        if (gridTo <= 0 || gridFrom >= gridTotal) return null;
        gridFrom = Math.max(0, gridFrom);
        gridTo = Math.min(gridTotal, gridTo);
        return { ...b, gridFrom, gridTo };
      })
      .filter(Boolean);
  }, [bookings, dayjsToGrid]);

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

  const isCellClosed = useCallback((gi: number): boolean => {
    if (!branch?.workingHours) return false;
    const realHour = gridToHour(gi);
    const isNextDay = gi >= todayHoursCount;
    const cellDay = isNextDay ? nextDay : date;
    return !isHourOpen(branch.workingHours, cellDay, realHour);
  }, [branch, date, nextDay, todayHoursCount, gridToHour]);

  const todayIsDayOff = branch?.workingHours
    ? isDayFullyClosed(branch.workingHours, date, gridStartHour, gridStartHour + gridTotal - 1)
    : false;

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
        {bookings.length > 0 && (
          <span style={{
            padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
            backgroundColor: '#E36FA8', color: '#fff',
          }}>
            {bookings.length} бр.
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <Button size="small" onClick={() => setDate(dayjs().startOf('day'))}>Сегодня</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Switch size="small" checked={slotsVisible} onChange={setSlotsVisible} />
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>Слоты</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button size="small" icon={<LeftOutlined />} onClick={() => setDate(d => d.subtract(1, 'day'))} />
            <DatePicker
              value={date}
              onChange={(d) => d && setDate(d.startOf('day'))}
              format="dd, D MMM"
              allowClear={false}
              style={{ width: 140, textAlign: 'center', fontWeight: 500 }}
              size="small"
            />
            <Button size="small" icon={<RightOutlined />} onClick={() => setDate(d => d.add(1, 'day'))} />
          </div>
        </div>
      </div>

      {/* DEBUG PANEL - always visible */}
      <div style={{
        padding: '8px 16px', marginBottom: 8, borderRadius: 8,
        backgroundColor: bookings.length > 0 ? '#f6ffed' : '#fff7e6',
        border: `1px solid ${bookings.length > 0 ? '#b7eb8f' : '#ffe58f'}`,
        fontSize: 13,
      }}>
        <strong>Данные:</strong>{' '}
        Бронирований: <strong style={{ color: bookings.length > 0 ? '#52c41a' : '#fa8c16' }}>{bookings.length}</strong> |{' '}
        Залов: <strong>{rooms.length}</strong> |{' '}
        Филиал: <strong>{selectedBranchId === 0 ? 'Все' : selectedBranchId ?? 'null'}</strong> |{' '}
        Дата: <strong>{date.format('DD.MM.YYYY')}</strong>
        {loadError && <span style={{ color: '#cf1322', marginLeft: 8 }}>| Ошибка: {loadError}</span>}
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

      {/* Status legend */}
      {!loading && bookings.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'cancelled').map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: STATUS_COLORS[key] }} />
              <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      ) : rooms.length === 0 && bookings.length === 0 ? (
        <Empty description="Нет данных для выбранного филиала" />
      ) : (
        <div ref={scrollRef} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)', border: '1px solid #e8e8e8', borderRadius: 8 }}>
          <div style={{ minWidth: gridTotal * CELL_W + ROOM_COL, position: 'relative' }}>
            {/* Now indicator line */}
            {date.isSame(dayjs(), 'day') && (() => {
              const now = dayjs();
              const h = now.hour() + now.minute() / 60;
              const nowGrid = h - gridStartHour;
              if (nowGrid >= 0 && nowGrid < gridTotal) {
                return (
                  <div style={{
                    position: 'absolute', left: ROOM_COL + nowGrid * CELL_W, top: 0, bottom: 0,
                    width: 2, backgroundColor: '#ff4d4f', zIndex: 20, pointerEvents: 'none', opacity: 0.7,
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: -4, width: 10, height: 10,
                      backgroundColor: '#ff4d4f', borderRadius: '50%',
                    }} />
                  </div>
                );
              }
              return null;
            })()}
            {/* Date row — sticky */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 12, backgroundColor: '#fff' }}>
              <div style={{ width: ROOM_COL, flexShrink: 0, position: 'sticky', left: 0, zIndex: 13, backgroundColor: '#fff' }} />
              <div style={{
                width: todayHoursCount * CELL_W, flexShrink: 0, textAlign: 'center', padding: '4px 0',
                fontWeight: 600, fontSize: 13, color: '#333', backgroundColor: '#F9F8FF',
                borderBottom: '2px solid #E36FA8', borderRadius: '6px 6px 0 0',
              }}>
                {date.format('dd, D MMMM')}
              </div>
              <div style={{
                width: (gridTotal - todayHoursCount) * CELL_W, flexShrink: 0, textAlign: 'center', padding: '4px 0',
                fontWeight: 600, fontSize: 13, color: '#666', backgroundColor: '#FAFAFA',
                borderBottom: '2px solid #d9d9d9', borderRadius: '6px 6px 0 0',
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
                    backgroundColor: closed ? '#fafafa' : undefined,
                  }}>
                    {String(gridToHour(gi)).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* === Bookings without room (from Bitrix) — shown at TOP === */}
            {(() => {
              const noRoomOverlays = getRoomBookings(null);
              if (noRoomOverlays.length === 0) return null;
              const { maxLane, items: laned } = assignLanes(noRoomOverlays);
              return (
                <div style={{ display: 'flex', borderBottom: '2px solid #E36FA8', alignItems: 'stretch', backgroundColor: '#FFF7E6' }}>
                  <div style={{
                    width: ROOM_COL, flexShrink: 0, padding: '8px 8px', borderRight: '1px solid #f0f0f0',
                    position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#FFF7E6',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: '16px', color: '#ad6800' }}>Бронирования</div>
                    <div style={{ color: '#ad6800', fontSize: 11, marginTop: 2 }}>{noRoomOverlays.length} на день</div>
                    <div style={{ color: '#d48806', fontSize: 10, marginTop: 2 }}>Зал не назначен</div>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: Math.max(1, maxLane) * LANE_HEIGHT }}>
                    {gridIndices.map(gi => (
                      <div key={gi} style={{
                        width: CELL_W, flexShrink: 0,
                        borderLeft: gi === todayHoursCount ? '2px solid #d9d9d9' : 'none',
                        backgroundColor: gi % 2 === 0 ? '#FFFBE6' : '#FFF7E6',
                      }} />
                    ))}
                    {laned.map((b: any) => {
                      const left = b.gridFrom * CELL_W + 2;
                      const width = (b.gridTo - b.gridFrom) * CELL_W - 4;
                      const bStart = dayjs(b.startTime);
                      const bEnd = dayjs(b.endTime);
                      const top = b.lane * LANE_HEIGHT + 2;
                      return (
                        <div
                          key={b.id}
                          onClick={() => { setPrefill(undefined); setSelectedBooking(b); setShowForm(true); }}
                          title={`${b.guestName || '—'} | ${bStart.format('HH:mm')}–${bEnd.format('HH:mm')} | ${STATUS_LABELS[b.status] || b.status} | ${b.guestCount || '?'} чел.`}
                          style={{
                            position: 'absolute', left, width: Math.max(width, 30), top, height: LANE_HEIGHT - 4,
                            borderRadius: 6, backgroundColor: STATUS_COLORS[b.status] || '#ddd',
                            border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer', zIndex: 2,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', padding: '0 3px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Room rows — grouped by branch when "Все" */}
            {(() => {
              // Group rooms by branch when viewing all
              const groupedRooms: { branchId: number; branchName: string; rooms: any[] }[] = [];
              if (selectedBranchId === 0) {
                const byBranch = new Map<number, any[]>();
                for (const room of rooms) {
                  if (!byBranch.has(room.branchId)) byBranch.set(room.branchId, []);
                  byBranch.get(room.branchId)!.push(room);
                }
                for (const [bid, branchRooms] of byBranch) {
                  const br = branches.find((b: any) => b.id === bid);
                  groupedRooms.push({ branchId: bid, branchName: br?.name || `Филиал ${bid}`, rooms: branchRooms });
                }
              } else {
                groupedRooms.push({ branchId: selectedBranchId!, branchName: '', rooms });
              }

              return groupedRooms.map((group, gi) => (
                <div key={group.branchId}>
                  {selectedBranchId === 0 && (
                    <div style={{
                      display: 'flex',
                      padding: '8px 12px',
                      backgroundColor: '#E36FA8',
                      borderTop: gi > 0 ? '3px solid #fff' : 'none',
                    }}>
                      <div style={{ width: ROOM_COL, flexShrink: 0, fontWeight: 700, fontSize: 13, color: '#fff' }}>
                        {group.branchName.replace(/^Харизма\s+/, '')}
                      </div>
                      <div style={{ flex: 1, fontWeight: 500, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                        {group.rooms.length} {group.rooms.length === 1 ? 'зал' : group.rooms.length < 5 ? 'зала' : 'залов'}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const mainRooms = group.rooms.filter((r: any) => r.category !== 'common');
                    const commonRooms = group.rooms.filter((r: any) => r.category === 'common');
                    const renderRoom = (room: any) => {
                      const isCommon = room.category === 'common';
                      const slots = roomSlots[room.id] || [];
                      const roomBookings = getRoomBookings(room.id);
                      return (
                        <div key={room.id} style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', alignItems: 'stretch' }}>
                          <div style={{
                            width: ROOM_COL, flexShrink: 0, padding: '8px 8px', borderRight: '1px solid #f0f0f0',
                            position: 'sticky', left: 0, zIndex: 5,
                            backgroundColor: isCommon ? '#F5F0FF' : '#fff',
                          }}>
                            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: '16px' }}>{room.name}</div>
                            <div style={{ fontWeight: 600, fontSize: 11, color: isCommon ? '#722ED1' : '#E36FA8', lineHeight: '14px' }}>
                              {CATEGORY_LABELS[room.category] || room.category}
                            </div>
                            <div style={{ color: '#8c8c8c', fontSize: 10, marginTop: 2 }}>до {room.capacityMax} чел.</div>
                          </div>

                          <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
                            {/* Slot frames — only for non-common rooms */}
                            {!isCommon && slotsVisible && slots.map((slot, idx) => {
                              const overlapsBooking = roomBookings.some((b: any) =>
                                b.gridFrom < slot.to && b.gridTo > slot.from
                              );
                              if (overlapsBooking) return null;
                              // Skip slots that fall in closed hours
                              const slotInClosed = isCellClosed(Math.floor(slot.from));
                              if (slotInClosed) return null;
                              return (
                                <SlotFrame
                                  key={idx}
                                  slot={slot}
                                  index={idx}
                                  roomId={room.id}
                                  allSlots={slots}
                                  onMove={handleSlotChange}
                                  onResize={handleSlotChange}
                                  onSlotClick={handleSlotClick}
                                  gridTotal={gridTotal}
                                  gridToTimeFn={gridToTime}
                                />
                              );
                            })}

                            {/* Background cells */}
                            {gridIndices.map(gi => {
                              const price = getPrice(room.category, gi);
                              const isMidnight = gi === todayHoursCount;
                              const gap = !isCommon && slotsVisible && isGapCell(room.id, gi);
                              const closed = isCellClosed(gi);

                              return (
                                <div key={gi} onClick={() => !closed && handleCellClick(room.id, gi)} style={{
                                  width: CELL_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  padding: '4px 2px', cursor: closed ? 'default' : 'pointer', zIndex: 1,
                                  borderLeft: isMidnight ? '2px solid #d9d9d9' : 'none',
                                }}>
                                  <div style={{
                                    width: '100%', height: '100%', borderRadius: 4, minHeight: 36,
                                    backgroundColor: closed ? '#e8e8e8' : gap ? '#FFF8E1' : isCommon ? '#F5F0FF' : '#F0FFF0',
                                    border: closed ? '1px solid #bfbfbf' : gap ? '1px dashed #FFD54F' : isCommon ? '1px solid #D3ADF7' : '1px solid #C8E6C9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: closed ? 8 : gap ? 8 : 10, fontWeight: closed ? 600 : 500,
                                    color: closed ? '#999' : gap ? '#BF8F00' : isCommon ? '#722ED1' : '#555',
                                    backgroundImage: closed ? 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 5px)' : undefined,
                                  }}>
                                    {closed ? 'закр.' : gap ? 'gap' : `${(price / 1000).toFixed(1)}k`}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Booking overlays */}
                            {roomBookings.map((b: any) => {
                              const left = b.gridFrom * CELL_W + 2;
                              const width = (b.gridTo - b.gridFrom) * CELL_W - 4;
                              const bStart = dayjs(b.startTime);
                              const bEnd = dayjs(b.endTime);
                              return (
                                <div
                                  key={b.id}
                                  onClick={() => { setPrefill(undefined); setSelectedBooking(b); setShowForm(true); }}
                                  style={{
                                    position: 'absolute',
                                    left,
                                    width,
                                    top: 4,
                                    bottom: 4,
                                    borderRadius: 4,
                                    backgroundColor: STATUS_COLORS[b.status] || '#ddd',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    zIndex: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    padding: '0 2px',
                                  }}
                                >
                                  <span style={{ fontSize: 10, fontWeight: 600, color: '#333', lineHeight: '13px', whiteSpace: 'nowrap' }}>
                                    {b.guestName?.split(' ')[0]}
                                  </span>
                                  <span style={{ fontSize: 8, color: '#555', lineHeight: '11px', whiteSpace: 'nowrap' }}>
                                    {bStart.format('HH:mm')}–{bEnd.format('HH:mm')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    };
                    return (
                      <>
                        {mainRooms.map(renderRoom)}
                        {commonRooms.length > 0 && (
                          <>
                            <div style={{
                              display: 'flex', padding: '5px 12px',
                              backgroundColor: '#F5F0FF', borderTop: '2px solid #D3ADF7', borderBottom: '1px solid #D3ADF7',
                            }}>
                              <div style={{ width: ROOM_COL, flexShrink: 0, fontWeight: 700, fontSize: 12, color: '#722ED1' }}>
                                Общие залы
                              </div>
                              <div style={{ flex: 1, fontWeight: 500, fontSize: 11, color: '#B37FEB' }}>
                                {commonRooms.length} {commonRooms.length === 1 ? 'зал' : commonRooms.length < 5 ? 'зала' : 'залов'}
                              </div>
                            </div>
                            {commonRooms.map(renderRoom)}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Debug info + error display */}
      {loadError && (
        <div style={{ padding: 12, marginTop: 8, backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8 }}>
          <strong style={{ color: '#cf1322' }}>Ошибка:</strong> {loadError}
        </div>
      )}

      {/* Bookings list — always visible after loading */}
      {!loading && (
        <div style={{ marginTop: 16, border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', backgroundColor: '#E36FA8', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            Бронирования на {date.format('D MMMM')} ({bookings.length})
          </div>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #e8e8e8' }}>Время</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #e8e8e8' }}>Гость</th>
                  <th style={{ padding: '6px 12px', textAlign: 'center', borderBottom: '1px solid #e8e8e8' }}>Чел.</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #e8e8e8' }}>Статус</th>
                  <th style={{ padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #e8e8e8' }}>Сумма</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #e8e8e8' }}>Зал</th>
                </tr>
              </thead>
              <tbody>
                {[...bookings]
                  .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((b: any) => {
                    const st = dayjs(b.startTime);
                    const en = dayjs(b.endTime);
                    return (
                      <tr
                        key={b.id}
                        onClick={() => { setPrefill(undefined); setSelectedBooking(b); setShowForm(true); }}
                        style={{ cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                      >
                        <td style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
                          {st.format('HH:mm')}–{en.format('HH:mm')}
                        </td>
                        <td style={{ padding: '6px 12px' }}>{b.guestName || '—'}</td>
                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>{b.guestCount || '—'}</td>
                        <td style={{ padding: '6px 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            backgroundColor: STATUS_COLORS[b.status] || '#ddd', color: '#fff',
                          }}>
                            {STATUS_LABELS[b.status] || b.status}
                          </span>
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {b.totalPrice ? `${(b.totalPrice / 1000).toFixed(1)}k` : '—'}
                        </td>
                        <td style={{ padding: '6px 12px', color: b.roomName ? '#333' : '#d48806' }}>
                          {b.roomName || 'Без зала'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
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
