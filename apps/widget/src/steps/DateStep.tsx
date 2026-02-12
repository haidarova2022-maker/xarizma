import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import type { BookingData } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export default function DateStep({ data, update, onNext }: Props) {
  const [month, setMonth] = useState(dayjs().month());
  const [year, setYear] = useState(dayjs().year());

  const today = dayjs().startOf('day');
  const maxDate = today.add(30, 'day');

  const days = useMemo(() => {
    const firstDay = dayjs().year(year).month(month).startOf('month');
    const daysInMonth = firstDay.daysInMonth();
    const startDow = (firstDay.day() + 6) % 7; // Monday = 0

    const cells: (dayjs.Dayjs | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(firstDay.date(d));
    }
    return cells;
  }, [month, year]);

  const selectDate = (d: dayjs.Dayjs) => {
    update({ date: d.format('YYYY-MM-DD') });
  };

  const guestOptions = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50];

  return (
    <div className="step-content">
      <h2 className="step-title">Выберите дату</h2>

      <div className="form-group">
        <label className="form-label">Количество гостей</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {guestOptions.map(n => (
            <button
              key={n}
              className={`time-slot ${data.guestCount === n ? 'selected' : ''}`}
              style={{ flex: 'none', width: 'auto', padding: '8px 16px' }}
              onClick={() => update({ guestCount: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <button
          className="btn-outline"
          style={{ border: 'none', cursor: 'pointer', fontSize: 18, background: 'none' }}
          onClick={() => {
            if (month === 0) { setMonth(11); setYear(y => y - 1); }
            else setMonth(m => m - 1);
          }}
        >
          ←
        </button>
        <span style={{ fontWeight: 600 }}>{MONTHS[month]} {year}</span>
        <button
          className="btn-outline"
          style={{ border: 'none', cursor: 'pointer', fontSize: 18, background: 'none' }}
          onClick={() => {
            if (month === 11) { setMonth(0); setYear(y => y + 1); }
            else setMonth(m => m + 1);
          }}
        >
          →
        </button>
      </div>

      <div className="date-grid">
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: 12, color: '#999', padding: 4 }}>{w}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const isToday = d.isSame(today, 'day');
          const isPast = d.isBefore(today);
          const isFuture = d.isAfter(maxDate);
          const isSelected = data.date === d.format('YYYY-MM-DD');
          const disabled = isPast || isFuture;

          return (
            <button
              key={d.format('YYYY-MM-DD')}
              className={`date-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              disabled={disabled}
              onClick={() => selectDate(d)}
            >
              {d.date()}
            </button>
          );
        })}
      </div>

      <button
        className="btn btn-primary"
        disabled={!data.date}
        onClick={onNext}
        style={{ marginTop: 16 }}
      >
        Продолжить
      </button>
    </div>
  );
}
