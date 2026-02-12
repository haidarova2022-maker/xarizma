import type { BookingData } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

export default function ContactStep({ data, update, onNext }: Props) {
  const isValid = data.guestName.trim() && data.guestPhone.trim();

  return (
    <div className="step-content">
      <h2 className="step-title">Контактные данные</h2>

      <div className="form-group">
        <label className="form-label">Имя *</label>
        <input
          className="form-input"
          value={data.guestName}
          onChange={(e) => update({ guestName: e.target.value })}
          placeholder="Как к вам обращаться?"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Телефон *</label>
        <input
          className="form-input"
          type="tel"
          value={data.guestPhone}
          onChange={(e) => update({ guestPhone: e.target.value })}
          placeholder="+7 (___) ___-__-__"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          className="form-input"
          type="email"
          value={data.guestEmail}
          onChange={(e) => update({ guestEmail: e.target.value })}
          placeholder="email@example.com"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Комментарий</label>
        <textarea
          className="form-input"
          rows={3}
          value={data.guestComment}
          onChange={(e) => update({ guestComment: e.target.value })}
          placeholder="Пожелания, повод мероприятия..."
          style={{ resize: 'vertical' }}
        />
      </div>

      <button
        className="btn btn-primary"
        disabled={!isValid}
        onClick={onNext}
      >
        Продолжить
      </button>
    </div>
  );
}
