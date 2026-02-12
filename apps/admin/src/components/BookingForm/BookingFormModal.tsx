import { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, DatePicker, TimePicker, InputNumber,
  Button, message, Space, Divider, Typography, Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useBranchStore } from '../../stores/branch-store';
import { getRooms, createBooking, updateBooking, calculatePrice } from '../../api/client';

const { Text } = Typography;

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

interface Props {
  open: boolean;
  booking?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingFormModal({ open, booking, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const { selectedBranchId } = useBranchStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<any>(null);

  useEffect(() => {
    if (!selectedBranchId || !open) return;
    getRooms(selectedBranchId).then(({ data }) => setRooms(data));
  }, [selectedBranchId, open]);

  useEffect(() => {
    if (booking) {
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
      form.setFieldsValue({
        bookingType: 'advance',
        source: 'admin',
      });
    }
    setPrice(null);
  }, [booking, open, form]);

  const onValuesChange = async () => {
    try {
      const values = form.getFieldsValue();
      if (values.roomId && values.date && values.timeFrom && values.timeTo) {
        const room = rooms.find((r: any) => r.id === values.roomId);
        if (!room) return;
        const startTime = values.date.hour(values.timeFrom.hour()).minute(values.timeFrom.minute());
        const endTime = values.date.hour(values.timeTo.hour()).minute(values.timeTo.minute());
        if (endTime.isAfter(startTime)) {
          const { data } = await calculatePrice({
            category: room.category,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          });
          setPrice(data);
        }
      }
    } catch {}
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const startTime = values.date.hour(values.timeFrom.hour()).minute(values.timeFrom.minute());
      const endTime = values.date.hour(values.timeTo.hour()).minute(values.timeTo.minute());

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
          bookingType: values.bookingType,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          guestCount: values.guestCount,
          guestName: values.guestName,
          guestPhone: values.guestPhone,
          guestEmail: values.guestEmail,
          guestComment: values.guestComment,
          source: 'admin',
        });
        message.success('Бронирование создано');
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="roomId" label="Зал" rules={[{ required: true }]}>
            <Select
              placeholder="Выберите зал"
              options={rooms.map((r: any) => ({
                value: r.id,
                label: `${r.name} (${CATEGORY_LABELS[r.category]}, до ${r.capacityMax} чел.)`,
              }))}
            />
          </Form.Item>

          <Form.Item name="bookingType" label="Тип" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'advance', label: 'Предварительная' },
                { value: 'walkin', label: 'Ситуативная' },
              ]}
            />
          </Form.Item>
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

        {price && (
          <div style={{
            background: '#f6f6f6',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <Text>{price.hours} ч. × {new Intl.NumberFormat('ru-RU').format(price.pricePerHour)} ₽/ч</Text>
            <Text strong style={{ fontSize: 18 }}>
              {new Intl.NumberFormat('ru-RU').format(price.basePrice)} ₽
            </Text>
          </div>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {booking ? 'Сохранить' : 'Создать'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
