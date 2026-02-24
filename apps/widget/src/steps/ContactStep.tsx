import { useState } from 'react';
import { applyPromoCode } from '../api';
import type { BookingData } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

export default function ContactStep({ data, update, onNext }: Props) {
  const isValid = data.guestName.trim() && data.guestPhone.trim();

  // Promo code (3.4)
  const [promoInput, setPromoInput] = useState(data.promoCode);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [promoMessage, setPromoMessage] = useState('');

  // Loyalty (1.4)
  const [showBonus, setShowBonus] = useState(false);
  const bonusAvailable = data.bonusPoints > 0;
  const maxBonusUsable = Math.min(data.bonusPoints, Math.floor(data.totalPrice * 0.3)); // Max 30% of total

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoStatus('idle');
    try {
      const { data: result } = await applyPromoCode(promoInput.trim());
      update({
        promoCode: promoInput.trim(),
        promoDiscount: result.discountAmount || result.value || 0,
      });
      setPromoStatus('success');
      setPromoMessage(`Скидка ${result.discountAmount || result.value || 0} ₽ применена`);
    } catch {
      setPromoStatus('error');
      setPromoMessage('Промокод не найден или истёк');
      update({ promoCode: '', promoDiscount: 0 });
    }
    setPromoLoading(false);
  };

  const handleBonusChange = (value: number) => {
    const clamped = Math.max(0, Math.min(value, maxBonusUsable));
    update({ useBonusPoints: clamped });
  };

  // Phone formatting
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    let formatted = '+7';
    if (digits.length > 1) formatted += ' (' + digits.slice(1, 4);
    if (digits.length > 4) formatted += ') ' + digits.slice(4, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let digits = raw.replace(/\D/g, '');
    if (digits.length > 0 && digits[0] === '8') digits = '7' + digits.slice(1);
    if (digits.length === 0 && raw.length > 0) {
      update({ guestPhone: '+7' });
      return;
    }
    if (digits.length > 11) digits = digits.slice(0, 11);
    if (digits.length === 0) {
      update({ guestPhone: '' });
    } else {
      update({ guestPhone: formatPhone(digits) });
    }
  };

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
          onChange={handlePhoneChange}
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

      {/* Promo code (3.4) */}
      <div className="form-group">
        <label className="form-label">Промокод</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            value={promoInput}
            onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus('idle'); }}
            placeholder="Введите промокод"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-outline"
            style={{ width: 'auto', padding: '12px 20px', whiteSpace: 'nowrap' }}
            onClick={handleApplyPromo}
            disabled={promoLoading || !promoInput.trim()}
          >
            {promoLoading ? '...' : 'Применить'}
          </button>
        </div>
        {promoStatus === 'success' && (
          <p style={{ fontSize: 13, color: '#00B894', marginTop: 6 }}>{promoMessage}</p>
        )}
        {promoStatus === 'error' && (
          <p style={{ fontSize: 13, color: '#D63031', marginTop: 6 }}>{promoMessage}</p>
        )}
      </div>

      {/* Loyalty / Bonus (1.4) */}
      {bonusAvailable && (
        <div style={{
          background: '#FFF8E1',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              У вас {new Intl.NumberFormat('ru-RU').format(data.bonusPoints)} бонусов
            </span>
            <button
              className="btn btn-outline"
              style={{ width: 'auto', padding: '6px 16px', fontSize: 13 }}
              onClick={() => setShowBonus(!showBonus)}
            >
              {showBonus ? 'Скрыть' : 'Списать'}
            </button>
          </div>
          {showBonus && (
            <div>
              <p style={{ fontSize: 12, color: '#636E72', marginBottom: 8 }}>
                Максимум списание: {new Intl.NumberFormat('ru-RU').format(maxBonusUsable)} бонусов (до 30% от суммы)
              </p>
              <input
                type="range"
                min={0}
                max={maxBonusUsable}
                step={100}
                value={data.useBonusPoints}
                onChange={(e) => handleBonusChange(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <p style={{ textAlign: 'center', fontWeight: 600, color: '#6C5CE7' }}>
                Списать: {new Intl.NumberFormat('ru-RU').format(data.useBonusPoints)} ₽
              </p>
            </div>
          )}
        </div>
      )}

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
