import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { createBooking } from '../api';
import type { BookingData } from '../App';

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  pobratski: 'По-братски',
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

  // Quick booking bonus timer (1.4)
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const quickBonusActive = timeLeft > 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = dayjs(data.date).format('DD.MM.YYYY');

  // Calculate final price
  const packagePrice = data.selectedPackage?.priceModifier || 0;
  const subtotal = data.totalPrice + packagePrice;
  const promoDiscount = data.promoDiscount || 0;
  const bonusDiscount = data.useBonusPoints || 0;
  const finalPrice = Math.max(0, subtotal - promoDiscount - bonusDiscount);
  const pricePerPerson = data.guestCount > 0 ? Math.round(finalPrice / data.guestCount) : 0;

  // Prepayment 70% (3.1)
  const prepayment = Math.round(finalPrice * 0.7);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

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
        promoCode: data.promoCode || undefined,
        packageId: data.selectedPackage?.id || undefined,
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

      {/* Quick bonus timer (1.4) */}
      {quickBonusActive && (
        <div style={{
          background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>+1 000 бонусов на карту</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>за бронь в течение 30 минут</div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
            {formatTimer(timeLeft)}
          </div>
        </div>
      )}

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
              {data.roomName} ({CATEGORY_LABELS[data.roomCategory] || data.roomCategory})
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
          {data.selectedPackage && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#999' }}>Пакет</span>
              <span style={{ fontWeight: 500 }}>{data.selectedPackage.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="price-summary">
        <div className="price-row">
          <span>{data.hours} ч. × {new Intl.NumberFormat('ru-RU').format(data.pricePerHour)} ₽/ч</span>
          <span>{new Intl.NumberFormat('ru-RU').format(data.totalPrice)} ₽</span>
        </div>
        {data.selectedPackage && (
          <div className="price-row">
            <span>Пакет «{data.selectedPackage.name}»</span>
            <span>+{new Intl.NumberFormat('ru-RU').format(packagePrice)} ₽</span>
          </div>
        )}
        {promoDiscount > 0 && (
          <div className="price-row" style={{ color: '#00B894' }}>
            <span>Промокод {data.promoCode}</span>
            <span>−{new Intl.NumberFormat('ru-RU').format(promoDiscount)} ₽</span>
          </div>
        )}
        {bonusDiscount > 0 && (
          <div className="price-row" style={{ color: '#00B894' }}>
            <span>Списание бонусов</span>
            <span>−{new Intl.NumberFormat('ru-RU').format(bonusDiscount)} ₽</span>
          </div>
        )}
        <div className="price-row total">
          <span>Итого</span>
          <span>{new Intl.NumberFormat('ru-RU').format(finalPrice)} ₽</span>
        </div>
        {/* 4.1 — Price per person */}
        <div className="price-row" style={{ fontSize: 13, color: '#636E72' }}>
          <span>Стоимость на 1 гостя</span>
          <span>{new Intl.NumberFormat('ru-RU').format(pricePerPerson)} ₽/чел</span>
        </div>
      </div>

      {/* Prepayment info (3.1) */}
      <div style={{
        background: '#FFF8E1',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 16,
        fontSize: 14,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Предоплата 70%</div>
        <div style={{ color: '#636E72' }}>
          К оплате сейчас: <strong style={{ color: '#6C5CE7' }}>{new Intl.NumberFormat('ru-RU').format(prepayment)} ₽</strong>
          <br />
          Остаток {new Intl.NumberFormat('ru-RU').format(finalPrice - prepayment)} ₽ — до начала бронирования
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
        {loading ? 'Бронируем...' : `Забронировать · ${new Intl.NumberFormat('ru-RU').format(prepayment)} ₽`}
      </button>
    </div>
  );
}
