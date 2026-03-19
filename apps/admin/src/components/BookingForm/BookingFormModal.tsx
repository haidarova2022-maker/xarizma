import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal, Form, Input, Select, DatePicker, TimePicker, InputNumber,
  Button, message, Space, Divider, Typography, Tag, Switch, Alert, Timeline,
} from 'antd';
import { TagOutlined, CheckCircleFilled, CloseOutlined, SwapOutlined, DragOutlined, HistoryOutlined, GiftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getRooms, createBooking, updateBooking, calculatePrice, getActivePromos, getCalendar, getBookingHistory, getPackages } from '../../api/client';

const { Text, Title } = Typography;

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  pobratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
  common: 'Общий зал',
};

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  // Normalize: strip leading 8 or 7, always use +7
  let d = digits;
  if (d.startsWith('8') && d.length > 1) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;
  // Format: +7 (XXX) XXX-XX-XX
  const parts = d.slice(1); // digits after 7
  if (parts.length === 0) return '+7';
  if (parts.length <= 3) return `+7 (${parts}`;
  if (parts.length <= 6) return `+7 (${parts.slice(0, 3)}) ${parts.slice(3)}`;
  if (parts.length <= 8) return `+7 (${parts.slice(0, 3)}) ${parts.slice(3, 6)}-${parts.slice(6)}`;
  return `+7 (${parts.slice(0, 3)}) ${parts.slice(3, 6)}-${parts.slice(6, 8)}-${parts.slice(8, 10)}`;
}

const CATEGORY_RANK: Record<string, number> = {
  common: 0,
  bratski: 1,
  pobratski: 1,
  vibe: 2,
  flex: 3,
  full_gas: 4,
};

interface Prefill {
  roomId?: number;
  date?: dayjs.Dayjs;
  timeFrom?: dayjs.Dayjs;
  timeTo?: dayjs.Dayjs;
}

interface PromoCode {
  id: number;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usageLimit: number | null;
  usageCount: number;
}

interface Props {
  open: boolean;
  booking?: any;
  prefill?: Prefill;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingFormModal({ open, booking, prefill, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const { selectedBranchId, branches } = useBranchStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<any>(null);
  const [isWalkin, setIsWalkin] = useState(false);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [transferMode, setTransferMode] = useState(false);
  const [transferBranchId, setTransferBranchId] = useState<number | null>(null);
  const [busyRoomIds, setBusyRoomIds] = useState<Set<number>>(new Set());
  const [transferResult, setTransferResult] = useState<{ date: string; time: string; room: string; branch: string; surcharge?: number } | null>(null);
  const [originalCategory, setOriginalCategory] = useState<string>('');
  const [transferSurcharge, setTransferSurcharge] = useState<number>(0);
  const [applySurcharge, setApplySurcharge] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<number>>(new Set());

  const checkBusyRooms = async () => {
    const values = form.getFieldsValue();
    if (!values.date || !values.timeFrom || !values.timeTo) {
      setBusyRoomIds(new Set());
      return;
    }
    const startTime = values.date.hour(values.timeFrom.hour()).minute(values.timeFrom.minute());
    let endTime = values.date.hour(values.timeTo.hour()).minute(values.timeTo.minute());
    if (endTime.isBefore(startTime)) endTime = endTime.add(1, 'day');
    const bid = transferBranchId || (booking?.branchId) || selectedBranchId;
    try {
      const { data: cal } = await getCalendar(
        bid || undefined,
        startTime.subtract(1, 'day').toISOString(),
        endTime.add(1, 'day').toISOString(),
      );
      const busy = new Set<number>();
      cal.forEach((b: any) => {
        if (b.status === 'cancelled') return;
        if (booking && b.id === booking.id) return;
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        if (startTime.valueOf() < bEnd && endTime.valueOf() > bStart) {
          busy.add(b.roomId);
        }
      });
      setBusyRoomIds(busy);
    } catch {
      setBusyRoomIds(new Set());
    }
  };

  useEffect(() => {
    if (selectedBranchId === null || !open) return;
    const bid = transferBranchId || selectedBranchId;
    getRooms(bid || undefined).then(({ data }) => {
      setRooms(data);
      // Capture original room category on first load
      if (booking && !originalCategory) {
        const origRoom = data.find((r: any) => r.id === booking.roomId);
        if (origRoom) setOriginalCategory(origRoom.category);
      }
    });
    if (!booking) {
      getActivePromos().then(({ data }) => setPromos(data)).catch(() => {});
      getPackages().then(({ data }) => setPackages(data.filter((p: any) => p.isActive !== false))).catch(() => {});
    }
    if (booking && !transferBranchId) {
      getBookingHistory(booking.id).then(({ data }) => setHistory(data)).catch(() => setHistory([]));
    }
  }, [selectedBranchId, open, booking, transferBranchId]);

  // Refresh busy rooms when transfer branch changes
  useEffect(() => {
    if (transferMode && open) {
      checkBusyRooms();
    }
  }, [transferBranchId, transferMode, open]);

  useEffect(() => {
    if (booking) {
      const walkin = booking.bookingType === 'walkin';
      setIsWalkin(walkin);
      setAppliedPromo(null);
      form.setFieldsValue({
        roomId: booking.roomId,
        bookingType: booking.bookingType,
        date: dayjs(booking.startTime),
        timeFrom: dayjs(booking.startTime),
        timeTo: dayjs(booking.endTime),
        guestCount: booking.guestCount,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        guestEmail: booking.guestEmail,
        guestComment: booking.guestComment,
        status: booking.status,
        paidAmount: booking.prepaymentAmount || 0,
      });
    } else {
      form.resetFields();
      setIsWalkin(false);
      setAppliedPromo(null);
      form.setFieldsValue({
        bookingType: 'advance',
        source: 'admin',
        ...(prefill?.roomId ? { roomId: prefill.roomId } : {}),
        ...(prefill?.date ? { date: prefill.date } : {}),
        ...(prefill?.timeFrom ? { timeFrom: prefill.timeFrom } : {}),
        ...(prefill?.timeTo ? { timeTo: prefill.timeTo } : {}),
      });
    }
    setPrice(null);
    setOverlapWarning(null);
    setTransferMode(false);
    setTransferBranchId(null);
    setBusyRoomIds(new Set());
    setTransferResult(null);
    setOriginalCategory('');
    setTransferSurcharge(0);
    setApplySurcharge(true);
    setHistory([]);
    setSelectedPackageIds(new Set());
  }, [booking, open, form]);

  const handleWalkinToggle = (checked: boolean) => {
    setIsWalkin(checked);
    if (checked) {
      form.setFieldsValue({
        bookingType: 'walkin',
        date: dayjs(),
      });
    } else {
      form.setFieldsValue({ bookingType: 'advance' });
    }
  };

  const onValuesChange = async (_: any, allValues: any) => {
    // Refresh busy rooms in transfer mode when date/time changes
    if (transferMode) {
      checkBusyRooms();
    }

    try {
      const values = form.getFieldsValue();
      if (values.roomId && values.date && values.timeFrom && values.timeTo) {
        const room = rooms.find((r: any) => r.id === values.roomId);
        if (!room) return;
        const startTime = values.date.hour(values.timeFrom.hour()).minute(values.timeFrom.minute());
        let endTime = values.date.hour(values.timeTo.hour()).minute(values.timeTo.minute());
        if (endTime.isBefore(startTime)) endTime = endTime.add(1, 'day');

        // Price
        const { data } = await calculatePrice({
          category: room.category,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
        setPrice(data);

        // Transfer surcharge calculation
        if (transferMode && booking && originalCategory) {
          const origRank = CATEGORY_RANK[originalCategory] ?? 0;
          const newRank = CATEGORY_RANK[room.category] ?? 0;
          if (newRank > origRank) {
            const diff = data.basePrice - (booking.totalPrice || 0);
            setTransferSurcharge(Math.max(0, diff));
          } else {
            setTransferSurcharge(0);
          }
        }

        // Overlap check
        const branchId = room.branchId || selectedBranchId;
        const { data: cal } = await getCalendar(
          branchId || undefined,
          startTime.subtract(1, 'day').toISOString(),
          endTime.add(1, 'day').toISOString(),
        );
        const overlap = cal.find((b: any) => {
          if (b.roomId !== values.roomId) return false;
          if (b.status === 'cancelled') return false;
          if (booking && b.id === booking.id) return false;
          const bStart = new Date(b.startTime).getTime();
          const bEnd = new Date(b.endTime).getTime();
          return startTime.valueOf() < bEnd && endTime.valueOf() > bStart;
        });
        setOverlapWarning(
          overlap
            ? `Зал занят: ${overlap.guestName} (${dayjs(overlap.startTime).format('HH:mm')}–${dayjs(overlap.endTime).format('HH:mm')})`
            : null
        );
      }
    } catch {}
  };

  // Calculate discount
  const discountAmount = appliedPromo && price
    ? appliedPromo.discountType === 'percentage'
      ? Math.round(price.basePrice * appliedPromo.discountValue / 100)
      : Math.min(appliedPromo.discountValue, price.basePrice)
    : 0;
  const finalPrice = price ? price.basePrice - discountAmount : 0;

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const startTime = values.date.hour(values.timeFrom.hour()).minute(values.timeFrom.minute());
      let endTime = values.date.hour(values.timeTo.hour()).minute(values.timeTo.minute());
      if (endTime.isBefore(startTime)) endTime = endTime.add(1, 'day');

      if (booking) {
        const updateData: any = {
          status: values.status,
          roomId: values.roomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          guestCount: values.guestCount,
          guestName: values.guestName,
          guestPhone: values.guestPhone,
          guestEmail: values.guestEmail,
          guestComment: values.guestComment,
          prepaymentAmount: values.paidAmount || 0,
        };
        if (transferBranchId) {
          updateData.branchId = transferBranchId;
        }
        if (transferMode && applySurcharge && transferSurcharge > 0) {
          updateData.totalPrice = (booking.totalPrice || 0) + transferSurcharge;
        }
        await updateBooking(booking.id, updateData);
        // Reload history after update
        getBookingHistory(booking.id).then(({ data }) => setHistory(data)).catch(() => {});

        if (transferMode) {
          const room = rooms.find((r: any) => r.id === values.roomId);
          const br = transferBranchId ? branches.find((b: any) => b.id === transferBranchId) : null;
          setTransferResult({
            date: startTime.format('dd, D MMMM YYYY'),
            time: `${startTime.format('HH:mm')} – ${endTime.format('HH:mm')}`,
            room: room?.name || `Зал #${values.roomId}`,
            branch: br?.name || '',
            surcharge: applySurcharge && transferSurcharge > 0 ? transferSurcharge : undefined,
          });
        } else {
          message.success('Бронирование обновлено');
        }
      } else {
        await createBooking({
          branchId: selectedBranchId,
          roomId: values.roomId,
          bookingType: isWalkin ? 'walkin' : 'advance',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          guestCount: values.guestCount,
          guestName: values.guestName,
          guestPhone: values.guestPhone,
          guestEmail: values.guestEmail,
          guestComment: values.guestComment,
          source: isWalkin ? 'walkin' : 'admin',
          ...(appliedPromo ? { promoCodeId: appliedPromo.id } : {}),
        });
        message.success(isWalkin ? 'Ситуативная бронь создана' : 'Бронирование создано');
      }
      if (!transferMode) onSuccess();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Draggable modal
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (open) setPos({ x: 0, y: 0 });
  }, [open]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.origX + ev.clientX - dragRef.current.startX,
        y: dragRef.current.origY + ev.clientY - dragRef.current.startY,
      });
    };
    const onMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [pos]);

  return (
    <>
    <Modal
      title={
        <div onMouseDown={onDragStart} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}>
          <DragOutlined style={{ color: '#bbb', fontSize: 12 }} />
          {booking ? `#${booking.id}${booking.roomName ? ` · ${booking.roomName}` : ''}${booking.branchName ? ` · ${booking.branchName}` : ''}` : 'Новое бронирование'}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      mask={false}
      style={{ top: 40, pointerEvents: 'auto' }}
      modalRender={(modal) => (
        <div style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, pointerEvents: 'auto' }}>
          {modal}
        </div>
      )}
      styles={{ wrapper: { pointerEvents: 'none' } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={onValuesChange}>
        {/* Walk-in toggle */}
        {!booking && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: isWalkin ? '#FFF0ED' : '#F5F5F5',
            borderRadius: 8,
            marginBottom: 16,
            border: isWalkin ? '1px solid #E36FA8' : '1px solid #e8e8e8',
          }}>
            <Switch checked={isWalkin} onChange={handleWalkinToggle} />
            <div>
              <Text strong>Ситуативная бронь (walk-in)</Text>
              <div style={{ fontSize: 12, color: '#636E72' }}>
                Клиент на месте, без предварительного бронирования
              </div>
            </div>
            {isWalkin && (
              <Tag color="purple" style={{ marginLeft: 'auto' }}>Walk-in</Tag>
            )}
          </div>
        )}

        {/* Walk-in info */}
        {isWalkin && !booking && (
          <Alert
            type="info"
            showIcon
            message="Уведомления клиенту не будут отправлены"
            description="Ситуативные брони не генерируют SMS/email уведомлений"
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="roomId" label="Зал" rules={[{ required: true }]}>
            <Select
              placeholder="Выберите зал"
              options={rooms.map((r: any) => {
                const busy = transferMode && busyRoomIds.has(r.id);
                return {
                  value: r.id,
                  label: busy
                    ? `${r.name} — занят`
                    : `${r.name} (${CATEGORY_LABELS[r.category] || r.category}, до ${r.capacityMax} чел.)`,
                  disabled: busy,
                };
              })}
            />
          </Form.Item>

          {!isWalkin && (
            <Form.Item name="bookingType" label="Тип" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'advance', label: 'Предварительная' },
                  { value: 'walkin', label: 'Ситуативная' },
                ]}
              />
            </Form.Item>
          )}

          {isWalkin && (
            <Form.Item label="Тип">
              <Tag color="purple" style={{ fontSize: 14, padding: '4px 12px', marginTop: 4 }}>
                Ситуативная бронь
              </Tag>
            </Form.Item>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item name="date" label="Дата" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="timeFrom" label="С" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" minuteStep={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="timeTo" label="До" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" minuteStep={30} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        {booking && (
          <>
            <Form.Item name="status" label="Статус">
              <Select
                options={[
                  { value: 'new', label: 'Новая' },
                  { value: 'awaiting_payment', label: 'Ожидает оплаты' },
                  { value: 'partially_paid', label: 'Частичная оплата' },
                  { value: 'fully_paid', label: 'Оплачена' },
                  { value: 'walkin', label: 'Walk-in' },
                  { value: 'completed', label: 'Завершена' },
                  { value: 'cancelled', label: 'Отменена' },
                ]}
              />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
              {({ getFieldValue }) =>
                getFieldValue('status') === 'cancelled' ? (
                  <Form.Item
                    name="cancellationReason"
                    label="Причина отказа"
                    rules={[{ required: true, message: 'Укажите причину отказа' }]}
                  >
                    <Select
                      placeholder="Выберите причину"
                      options={[
                        { value: 'Изменились планы', label: 'Изменились планы' },
                        { value: 'Не устроила цена', label: 'Не устроила цена' },
                        { value: 'Нашли другое место', label: 'Нашли другое место' },
                        { value: 'Клиент заболел', label: 'Клиент заболел' },
                        { value: 'Не пришёл', label: 'Не пришёл (no-show)' },
                        { value: 'Двойное бронирование', label: 'Двойное бронирование' },
                        { value: 'Другое', label: 'Другое' },
                      ]}
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </>
        )}

        {/* Transfer section for existing bookings */}
        {booking && (
          <div style={{ marginBottom: 16 }}>
            {!transferMode ? (
              <Button
                icon={<SwapOutlined />}
                onClick={() => setTransferMode(true)}
                style={{ width: '100%' }}
              >
                Перенести бронирование
              </Button>
            ) : (
              <div style={{
                background: '#FFF7E6',
                padding: '14px 16px',
                borderRadius: 8,
                border: '1px solid #FFD591',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text strong style={{ fontSize: 14 }}>
                    <SwapOutlined style={{ marginRight: 6 }} />
                    Перенос бронирования
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setTransferMode(false);
                      setTransferBranchId(null);
                      // Reset room to original
                      form.setFieldsValue({ roomId: booking.roomId });
                    }}
                  />
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
                  Измените дату/время для переноса внутри филиала, или выберите другой филиал
                </Text>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Филиал</Text>
                  <Select
                    value={transferBranchId || booking.branchId}
                    onChange={(val) => {
                      setTransferBranchId(val === booking.branchId ? null : val);
                      form.setFieldsValue({ roomId: undefined });
                    }}
                    style={{ width: '100%' }}
                    options={branches.filter((b: any) => b.id !== 0).map((b: any) => ({
                      value: b.id,
                      label: b.name,
                    }))}
                  />
                </div>

                {/* Surcharge for higher category */}
                {transferSurcharge > 0 && (
                  <div style={{
                    marginTop: 10, padding: '10px 12px', borderRadius: 6,
                    backgroundColor: applySurcharge ? '#FFF1F0' : '#F6FFED',
                    border: applySurcharge ? '1px solid #FFCCC7' : '1px solid #B7EB8F',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13 }}>
                        Категория выше: <Text strong>{CATEGORY_LABELS[originalCategory]}</Text> → <Text strong>{CATEGORY_LABELS[rooms.find((r: any) => r.id === form.getFieldValue('roomId'))?.category] || '—'}</Text>
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13 }}>Доплата</Text>
                      <Text strong style={{ fontSize: 16, color: '#cf1322' }}>+{fmt(transferSurcharge)} ₽</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Switch size="small" checked={applySurcharge} onChange={setApplySurcharge} />
                      <Text style={{ fontSize: 12 }}>
                        {applySurcharge ? 'Применить доплату' : 'Без доплаты (прежняя цена)'}
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment summary for existing bookings */}
        {booking && (
          <div style={{
            background: '#f6f6f6',
            padding: '14px 16px',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <Text strong style={{ fontSize: 14, marginBottom: 10, display: 'block' }}>Оплата</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text type="secondary">Стоимость</Text>
              <Text>{fmt(booking.totalPrice)} ₽</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text type="secondary">Оплачено (п/п)</Text>
              <Form.Item name="paidAmount" style={{ margin: 0 }}>
                <InputNumber
                  min={0}
                  max={booking.totalPrice}
                  style={{ width: 130 }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  addonAfter="₽"
                  size="small"
                />
              </Form.Item>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text type="secondary">Остаток</Text>
              <Text strong style={{ color: (booking.totalPrice - (form.getFieldValue('paidAmount') || booking.prepaymentAmount || 0)) > 0 ? '#cf1322' : '#389e0d' }}>
                {fmt(booking.totalPrice - (form.getFieldValue('paidAmount') || booking.prepaymentAmount || 0))} ₽
              </Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>Итого</Text>
              <Text strong style={{ fontSize: 16 }}>{fmt(booking.totalPrice)} ₽</Text>
            </div>
          </div>
        )}

        {/* Change history */}
        {booking && history.length > 0 && (
          <div style={{
            background: '#FAFBFF',
            padding: '14px 16px',
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid #e8e8e8',
            maxHeight: 200,
            overflowY: 'auto',
          }}>
            <Text strong style={{ fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HistoryOutlined /> История изменений
            </Text>
            <Timeline
              style={{ marginTop: 12, marginBottom: 0 }}
              items={history.map((h: any) => ({
                color: h.changes.some((c: string) => c.startsWith('Статус') && c.includes('Отказ')) ? 'red'
                  : h.changes.some((c: string) => c.startsWith('Филиал') || c.startsWith('Зал') || c.startsWith('Время')) ? 'blue'
                  : 'gray',
                children: (
                  <div>
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>
                      {dayjs(h.createdAt).format('DD.MM.YYYY HH:mm')} — {h.user}
                    </div>
                    {h.changes.map((c: string, i: number) => (
                      <div key={i} style={{ fontSize: 12, lineHeight: '18px' }}>{c}</div>
                    ))}
                  </div>
                ),
              }))}
            />
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="guestName" label="Имя гостя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="guestPhone" label="Телефон" rules={[{ required: true }]}
            getValueFromEvent={(e) => formatPhone(e.target.value)}
          >
            <Input placeholder="+7 (___) ___-__-__" maxLength={18} />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="guestEmail" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="guestCount" label="Кол-во гостей" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <Form.Item name="guestComment" label="Комментарий">
          <Input.TextArea rows={2} />
        </Form.Item>

        {/* Overlap warning */}
        {overlapWarning && (
          <Alert
            type="error"
            showIcon
            message="Пересечение с другой бронью"
            description={overlapWarning}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Price block */}
        {price && (
          <div style={{
            background: '#f6f6f6',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text>{price.hours} ч. x {fmt(price.pricePerHour)} ₽/ч</Text>
              <Text strong style={{ fontSize: 18, textDecoration: appliedPromo ? 'line-through' : 'none', color: appliedPromo ? '#999' : undefined }}>
                {fmt(price.basePrice)} ₽
              </Text>
            </div>
            {appliedPromo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: '#52c41a' }}>
                  Скидка ({appliedPromo.code}){' '}
                  {appliedPromo.discountType === 'percentage' ? `−${appliedPromo.discountValue}%` : `−${fmt(appliedPromo.discountValue)} ₽`}
                </Text>
                <Text strong style={{ fontSize: 20, color: '#E36FA8' }}>
                  {fmt(finalPrice)} ₽
                </Text>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Предоплата 70%</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {fmt(Math.round((appliedPromo ? finalPrice : price.basePrice) * 0.7))} ₽
              </Text>
            </div>
          </div>
        )}

        {/* Active promos block */}
        {!booking && promos.length > 0 && (
          <div style={{
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            background: '#FAFBFF',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <TagOutlined style={{ color: '#E36FA8' }} />
              <Text strong style={{ fontSize: 14, color: '#E36FA8' }}>Активные акции</Text>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {promos.map(promo => {
                const isApplied = appliedPromo?.id === promo.id;
                const discountLabel = promo.discountType === 'percentage'
                  ? `−${promo.discountValue}%`
                  : `−${fmt(promo.discountValue)} ₽`;
                const remaining = promo.usageLimit
                  ? `${promo.usageLimit - promo.usageCount} из ${promo.usageLimit}`
                  : 'без лимита';

                return (
                  <div
                    key={promo.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: isApplied ? '2px solid #E36FA8' : '1px solid #e8e8e8',
                      background: isApplied ? '#FFF0ED' : '#fff',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isApplied && <CheckCircleFilled style={{ color: '#E36FA8', fontSize: 16 }} />}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Tag
                            color={isApplied ? 'purple' : 'default'}
                            style={{ fontWeight: 600, fontSize: 12 }}
                          >
                            {promo.code}
                          </Tag>
                          <Text strong style={{ fontSize: 14, color: '#52c41a' }}>
                            {discountLabel}
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          осталось {remaining}
                        </Text>
                      </div>
                    </div>

                    {isApplied ? (
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => setAppliedPromo(null)}
                      >
                        Убрать
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        style={{ backgroundColor: '#E36FA8', borderColor: '#E36FA8' }}
                        onClick={() => setAppliedPromo(promo)}
                      >
                        Применить
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional services */}
        {!booking && packages.length > 0 && (
          <div style={{
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            background: '#F6FFED',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <GiftOutlined style={{ color: '#52c41a' }} />
              <Text strong style={{ fontSize: 14, color: '#52c41a' }}>Доп. услуги</Text>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {packages.map((pkg: any) => {
                const isSelected = selectedPackageIds.has(pkg.id);
                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      setSelectedPackageIds(prev => {
                        const next = new Set(prev);
                        if (next.has(pkg.id)) next.delete(pkg.id); else next.add(pkg.id);
                        return next;
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: isSelected ? '2px solid #52c41a' : '1px solid #e8e8e8',
                      background: isSelected ? '#F6FFED' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isSelected && <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />}
                      <div>
                        <Text strong style={{ fontSize: 13 }}>{pkg.name}</Text>
                        <div><Text type="secondary" style={{ fontSize: 11 }}>{pkg.description}</Text></div>
                      </div>
                    </div>
                    <Text strong style={{ color: '#52c41a', whiteSpace: 'nowrap' }}>+{fmt(pkg.priceModifier)} ₽</Text>
                  </div>
                );
              })}
            </div>
            {selectedPackageIds.size > 0 && price && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: '#fff', border: '1px solid #d9f7be' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Доп. услуги</Text>
                  <Text>+{fmt(packages.filter((p: any) => selectedPackageIds.has(p.id)).reduce((s: number, p: any) => s + p.priceModifier, 0))} ₽</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text strong>Итого с услугами</Text>
                  <Text strong style={{ fontSize: 16, color: '#E36FA8' }}>
                    {fmt((appliedPromo ? finalPrice : (price?.basePrice || 0)) + packages.filter((p: any) => selectedPackageIds.has(p.id)).reduce((s: number, p: any) => s + p.priceModifier, 0))} ₽
                  </Text>
                </div>
              </div>
            )}
          </div>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>Закрыть</Button>
            {booking && form.getFieldValue('status') !== 'cancelled' && (
              <Button
                danger
                onClick={() => {
                  form.setFieldsValue({ status: 'cancelled' });
                  // Force re-render to show cancellation reason field
                  form.validateFields(['status']);
                }}
              >
                Отказ
              </Button>
            )}
            <Button type="primary" htmlType="submit" loading={loading} disabled={!!overlapWarning}>
              {booking ? (transferMode ? 'Перенести' : 'Сохранить') : isWalkin ? 'Создать walk-in' : 'Создать'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>

    {/* Transfer confirmation popup */}
    <Modal
      open={!!transferResult}
      footer={null}
      closable={false}
      width={400}
      centered
    >
      {transferResult && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            backgroundColor: '#F6FFED', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleFilled style={{ fontSize: 32, color: '#52c41a' }} />
          </div>
          <Title level={4} style={{ margin: '0 0 16px' }}>Бронирование перенесено</Title>
          <div style={{
            background: '#FAFAFA', borderRadius: 8, padding: '16px 20px',
            textAlign: 'left', marginBottom: 20, border: '1px solid #f0f0f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Дата</Text>
              <Text strong>{transferResult.date}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Время</Text>
              <Text strong>{transferResult.time}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: transferResult.branch ? 8 : 0 }}>
              <Text type="secondary">Зал</Text>
              <Text strong>{transferResult.room}</Text>
            </div>
            {transferResult.branch && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: transferResult.surcharge ? 8 : 0 }}>
                <Text type="secondary">Филиал</Text>
                <Text strong style={{ color: '#E36FA8' }}>{transferResult.branch}</Text>
              </div>
            )}
            {transferResult.surcharge && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                <Text type="secondary">Доплата</Text>
                <Text strong style={{ color: '#cf1322' }}>+{fmt(transferResult.surcharge)} ₽</Text>
              </div>
            )}
          </div>
          <Button
            type="primary"
            size="large"
            block
            onClick={() => { setTransferResult(null); onSuccess(); }}
          >
            Готово
          </Button>
        </div>
      )}
    </Modal>
    </>
  );
}
