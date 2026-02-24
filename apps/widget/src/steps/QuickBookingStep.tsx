import { useState } from 'react';
import dayjs from 'dayjs';
import { getBranches, getRooms, calculatePrice } from '../api';
import type { BookingData } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onSwitchToFull: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  pobratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

const HOURS = [
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  '21:00', '22:00', '23:00', '00:00', '01:00', '02:00',
];

interface QuickResult {
  branch: any;
  room: any;
  price: any;
}

export default function QuickBookingStep({ data, update, onNext, onSwitchToFull }: Props) {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(2);
  const [guests, setGuests] = useState(2);
  const [phone, setPhone] = useState('');

  const [results, setResults] = useState<QuickResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!date || !time) return;
    setLoading(true);
    setSearched(true);

    const fromH = parseInt(time.split(':')[0]);
    const toH = (fromH + duration) % 24;
    const timeTo = String(toH).padStart(2, '0') + ':00';
    const startTime = new Date(date);
    startTime.setHours(fromH, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(toH, 0, 0, 0);
    if (toH <= fromH) endTime.setDate(endTime.getDate() + 1);

    try {
      const { data: branches } = await getBranches();
      const allResults: QuickResult[] = [];

      await Promise.all(branches.map(async (branch: any) => {
        try {
          const { data: rooms } = await getRooms(branch.id);
          const suitable = rooms.filter((r: any) => r.capacityMax >= guests);

          for (const room of suitable.slice(0, 2)) {
            try {
              const { data: price } = await calculatePrice({
                category: room.category,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              });
              allResults.push({ branch, room, price });
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }));

      // Sort by price, take top 3
      allResults.sort((a, b) => (a.price.basePrice || 0) - (b.price.basePrice || 0));
      setResults(allResults.slice(0, 3));
    } catch { /* ignore */ }
    setLoading(false);
  };

  const selectResult = (result: QuickResult) => {
    const fromH = parseInt(time.split(':')[0]);
    const toH = (fromH + duration) % 24;
    const timeTo = String(toH).padStart(2, '0') + ':00';

    update({
      branchId: result.branch.id,
      branchName: result.branch.name,
      date,
      timeFrom: time,
      timeTo,
      roomId: result.room.id,
      roomName: result.room.name,
      roomCategory: result.room.category,
      guestCount: guests,
      guestPhone: phone,
      pricePerHour: result.price.pricePerHour || 0,
      totalPrice: result.price.basePrice || 0,
      hours: result.price.hours || duration,
    });
    onNext();
  };

  const today = dayjs().format('YYYY-MM-DD');
  const maxDate = dayjs().add(30, 'day').format('YYYY-MM-DD');

  return (
    <div className="step-content">
      <h2 className="step-title">Быстрая бронь</h2>
      <p style={{ color: '#636E72', fontSize: 14, marginBottom: 16 }}>
        Введите параметры — мы подберём лучшие варианты
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Дата</label>
          <input
            className="form-input"
            type="date"
            value={date}
            min={today}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Гостей</label>
          <select
            className="form-input"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Время начала</label>
          <select
            className="form-input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          >
            <option value="">—</option>
            {HOURS.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Часов</label>
          <select
            className="form-input"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n} ч</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Телефон</label>
        <input
          className="form-input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 (___) ___-__-__"
        />
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSearch}
        disabled={!date || !time || loading}
        style={{ marginBottom: 16 }}
      >
        {loading ? 'Ищем варианты...' : 'Найти залы'}
      </button>

      {searched && !loading && results.length === 0 && (
        <p style={{ color: '#999', textAlign: 'center', padding: 16 }}>
          К сожалению, нет свободных залов на выбранное время
        </p>
      )}

      {results.map((r, i) => (
        <div
          key={i}
          className="room-card"
          onClick={() => selectResult(r)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3>{r.room.name}</h3>
              <p style={{ fontSize: 13, color: '#636E72' }}>
                {r.branch.name} · м. {r.branch.metro}
              </p>
              <p style={{ fontSize: 13, color: '#636E72' }}>
                До {r.room.capacityMax} гостей · {r.room.areaSqm} м²
              </p>
              <span className={`category-tag category-${r.room.category}`}>
                {CATEGORY_LABELS[r.room.category] || r.room.category}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#6C5CE7' }}>
                {new Intl.NumberFormat('ru-RU').format(r.price.basePrice || 0)} ₽
              </div>
              <div style={{ fontSize: 13, color: '#999' }}>
                {new Intl.NumberFormat('ru-RU').format(r.price.pricePerHour || 0)} ₽/ч
              </div>
              <div style={{ fontSize: 12, color: '#00B894' }}>
                {guests > 0 ? new Intl.NumberFormat('ru-RU').format(Math.round((r.price.basePrice || 0) / guests)) : 0} ₽/чел
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        className="btn btn-outline"
        onClick={onSwitchToFull}
        style={{ marginTop: 8 }}
      >
        Подробное бронирование
      </button>
    </div>
  );
}
