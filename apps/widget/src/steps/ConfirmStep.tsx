import { useState } from 'react';
import dayjs from 'dayjs';
import { createBooking } from '../api';
import type { BookingData } from '../App';

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

interface Props {
  data: BookingData;
  onNext: (bookingId: number) => void;
}

export default function ConfirmStep({ data, onNext }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formattedDate = dayjs(data.date).format('DD.MM.YYYY');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    const fromH = parseInt(data.timeFrom.split(':')[0]);
    const toH = parseInt(data.timeTo.split(':')[0]);
    const startTime = new Date(data.date);
    startTime.setHours(fromH, 0, 0, 0);
    const endTime = new Date(data.date);
    endTime.setHours(toH, 0, 0, 0);
    if (toH <= fromH) endTime.setDate(endTime.getDate() + 1);

    try {
      const { data: booking } = await createBooking({
        branchId: data.branchId,
        roomId: data.roomId,
        bookingType: 'advance',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        guestCount: data.guestCount,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail || undefined,
        guestComment: data.guestComment || undefined,
        source: 'widget',
      });
      onNext(booking.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Произошла ошибка при бронировании');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-content">
      <h2 className="step-title">Подтверждение</h2>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#999' }}>Филиал</span>
            <span style={{ fontWeight: 500 }}>{data.branchName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#999' }}>Дата</span>
            <span style={{ fontWeight: 500 }}>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#999' }}>Время</span>
            <span style={{ fontWeight: 500 }}>{data.timeFrom} – {data.timeTo}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#999' }}>Зал</span>
            <span style={{ fontWeight: 500 }}>
              {data.roomName} ({CATEGORY_LABELS[data.roomCategory]})
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#999' }}>Гостей</span>
            <span style={{ fontWeight: 500 }}>{data.guestCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#999' }}>Гость</span>
            <span style={{ fontWeight: 500 }}>{data.guestName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#999' }}>Телефон</span>
            <span style={{ fontWeight: 500 }}>{data.guestPhone}</span>
          </div>
        </div>
      </div>

      <div className="price-summary">
        <div className="price-row">
          <span>{data.hours} ч. × {new Intl.NumberFormat('ru-RU').format(data.pricePerHour)} ₽/ч</span>
          <span>{new Intl.NumberFormat('ru-RU').format(data.totalPrice)} ₽</span>
        </div>
        <div className="price-row total">
          <span>Итого</span>
          <span>{new Intl.NumberFormat('ru-RU').format(data.totalPrice)} ₽</span>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#FFEBEE',
          color: '#C62828',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading ? 'Бронируем...' : 'Забронировать'}
      </button>
    </div>
  );
}
