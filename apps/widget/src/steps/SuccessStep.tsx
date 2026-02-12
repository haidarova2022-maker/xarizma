import dayjs from 'dayjs';
import type { BookingData } from '../App';

interface Props {
  bookingId: number;
  data: BookingData;
  onReset: () => void;
}

export default function SuccessStep({ bookingId, data, onReset }: Props) {
  return (
    <div className="success-screen">
      <div className="success-icon">✓</div>
      <h2 style={{ fontSize: 24, marginBottom: 8 }}>Бронь оформлена!</h2>
      <p style={{ color: '#636E72', marginBottom: 24 }}>
        Номер бронирования: <strong>#{bookingId}</strong>
      </p>

      <div style={{
        background: '#F8F7FF',
        borderRadius: 12,
        padding: 20,
        textAlign: 'left',
        marginBottom: 24,
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
        <div>
          <span style={{ color: '#999', fontSize: 13 }}>Сумма:</span>{' '}
          <strong style={{ color: '#6C5CE7' }}>
            {new Intl.NumberFormat('ru-RU').format(data.totalPrice)} ₽
          </strong>
        </div>
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
