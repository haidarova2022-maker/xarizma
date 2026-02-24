import dayjs from 'dayjs';
import type { BookingData } from '../App';

interface Props {
  bookingId: number;
  data: BookingData;
  onReset: () => void;
}

export default function SuccessStep({ bookingId, data, onReset }: Props) {
  const packagePrice = data.selectedPackage?.priceModifier || 0;
  const finalPrice = Math.max(0, data.totalPrice + packagePrice - (data.promoDiscount || 0) - (data.useBonusPoints || 0));
  const prepayment = Math.round(finalPrice * 0.7);

  return (
    <div className="success-screen">
      <div className="success-icon">&#10003;</div>
      <h2 style={{ fontSize: 24, marginBottom: 8 }}>Бронь оформлена!</h2>
      <p style={{ color: '#636E72', marginBottom: 24 }}>
        Номер бронирования: <strong>#{bookingId}</strong>
      </p>

      <div style={{
        background: '#F8F7FF',
        borderRadius: 12,
        padding: 20,
        textAlign: 'left',
        marginBottom: 16,
      }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#999', fontSize: 13 }}>Филиал:</span>{' '}
          <strong>{data.branchName}</strong>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#999', fontSize: 13 }}>Дата:</span>{' '}
          <strong>{dayjs(data.date).format('DD.MM.YYYY')}</strong>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#999', fontSize: 13 }}>Время:</span>{' '}
          <strong>{data.timeFrom} – {data.timeTo}</strong>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#999', fontSize: 13 }}>Зал:</span>{' '}
          <strong>{data.roomName}</strong>
        </div>
        {data.selectedPackage && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: '#999', fontSize: 13 }}>Пакет:</span>{' '}
            <strong>{data.selectedPackage.name}</strong>
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#999', fontSize: 13 }}>Предоплата:</span>{' '}
          <strong style={{ color: '#6C5CE7' }}>
            {new Intl.NumberFormat('ru-RU').format(prepayment)} ₽
          </strong>
        </div>
        <div>
          <span style={{ color: '#999', fontSize: 13 }}>Итого:</span>{' '}
          <strong style={{ color: '#6C5CE7' }}>
            {new Intl.NumberFormat('ru-RU').format(finalPrice)} ₽
          </strong>
        </div>
      </div>

      {/* Bonus earned notification (1.4) */}
      <div style={{
        background: 'linear-gradient(135deg, #00B894, #55EFC4)',
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 16,
        color: 'white',
        textAlign: 'center',
      }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>+1 000 бонусов начислено!</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>Спасибо за быструю бронь</div>
      </div>

      {/* SMS notification info (4.2) */}
      <div style={{
        background: '#F0F0F0',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 24,
        fontSize: 13,
        color: '#636E72',
        textAlign: 'left',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: '#2D3436' }}>Уведомления</div>
        <p>SMS с подтверждением отправлено на {data.guestPhone}</p>
        <p style={{ marginTop: 4 }}>Напоминание придёт за 2 часа до начала</p>
      </div>

      <p style={{ color: '#636E72', fontSize: 14, marginBottom: 24 }}>
        Мы свяжемся с вами для подтверждения бронирования.
      </p>

      <button className="btn btn-outline" onClick={onReset}>
        Новое бронирование
      </button>
    </div>
  );
}
