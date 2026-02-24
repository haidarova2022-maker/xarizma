import { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, DatePicker, TimePicker, InputNumber,
  Button, message, Space, Divider, Typography, Tag, Switch, Alert,
} from 'antd';
import { TagOutlined, CheckCircleFilled, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getRooms, createBooking, updateBooking, calculatePrice, getActivePromos } from '../../api/client';

const { Text } = Typography;

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  pobratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

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
  const { selectedBranchId } = useBranchStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<any>(null);
  const [isWalkin, setIsWalkin] = useState(false);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  useEffect(() => {
    if (!selectedBranchId || !open) return;
    getRooms(selectedBranchId).then(({ data }) => setRooms(data));
    if (!booking) {
      getActivePromos().then(({ data }) => setPromos(data)).catch(() => {});
    }
  }, [selectedBranchId, open, booking]);

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

  const onValuesChange = async () => {
    try {
      const values = form.getFieldsValue();
      if (values.roomId && values.date && values.timeFrom && values.timeTo) {
        const room = rooms.find((r: any) => r.id === values.roomId);
        if (!room) return;
        const startTime = values.date.hour(values.timeFrom.hour()).minute(values.timeFrom.minute());
        let endTime = values.date.hour(values.timeTo.hour()).minute(values.timeTo.minute());
        if (endTime.isBefore(startTime)) endTime = endTime.add(1, 'day');
        const { data } = await calculatePrice({
          category: room.category,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
        setPrice(data);
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
        await updateBooking(booking.id, {
          status: values.status,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          guestCount: values.guestCount,
          guestName: values.guestName,
          guestPhone: values.guestPhone,
          guestEmail: values.guestEmail,
          guestComment: values.guestComment,
        });
        message.success('Бронирование обновлено');
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
      onSuccess();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={booking ? `Бронирование #${booking.id}` : 'Новое бронирование'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
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
              options={rooms.map((r: any) => ({
                value: r.id,
                label: `${r.name} (${CATEGORY_LABELS[r.category] || r.category}, до ${r.capacityMax} чел.)`,
              }))}
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
          <Form.Item name="status" label="Статус">
            <Select
              options={[
                { value: 'new', label: 'Новая' },
                { value: 'awaiting_payment', label: 'Ожидает оплаты' },
                { value: 'partially_paid', label: 'Частичная оплата' },
                { value: 'fully_paid', label: 'Оплачена' },
                { value: 'walkin', label: 'Ситуативная' },
                { value: 'completed', label: 'Реализована' },
                { value: 'cancelled', label: 'Отменена' },
              ]}
            />
          </Form.Item>
        )}

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="guestName" label="Имя гостя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="guestPhone" label="Телефон" rules={[{ required: true }]}>
            <Input placeholder="+7 (___) ___-__-__" />
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

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {booking ? 'Сохранить' : isWalkin ? 'Создать walk-in' : 'Создать'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
