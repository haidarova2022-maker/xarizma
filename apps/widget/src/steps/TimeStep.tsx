import { useEffect, useState } from 'react';
import { getAvailableSlots } from '../api';
import type { BookingData } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

const HOURS = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
  '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00',
];

export default function TimeStep({ data, update, onNext }: Props) {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data.branchId || !data.date) return;
    setLoading(true);
    getAvailableSlots({
      branchId: data.branchId,
      date: data.date,
      guestCount: data.guestCount,
    })
      .then(({ data: list }) => setSlots(list))
      .finally(() => setLoading(false));
  }, [data.branchId, data.date, data.guestCount]);

  // Check which start hours have available rooms
  const availableStartHours = new Set<string>();
  slots.forEach(s => {
    const h = new Date(s.startTime).getHours();
    availableStartHours.add(String(h).padStart(2, '0') + ':00');
  });

  const selectTime = (from: string, to: string) => {
    update({ timeFrom: from, timeTo: to });
  };

  // Duration options after selecting start
  const durations = [2, 3, 4, 5, 6];

  if (loading) {
    return <div className="step-content" style={{ textAlign: 'center', padding: 48 }}>Загрузка слотов...</div>;
  }

  return (
    <div className="step-content">
      <h2 className="step-title">Выберите время</h2>

      <label className="form-label">Начало</label>
      <div className="time-slots" style={{ marginBottom: 16 }}>
        {HOURS.map(h => {
          const available = availableStartHours.has(h);
          const isSelected = data.timeFrom === h;
          return (
            <button
              key={h}
              className={`time-slot ${isSelected ? 'selected' : ''} ${!available ? 'unavailable' : ''}`}
              disabled={!available}
              onClick={() => {
                update({ timeFrom: h, timeTo: '' });
              }}
            >
              {h}
            </button>
          );
        })}
      </div>

      {data.timeFrom && (
        <>
          <label className="form-label">Продолжительность</label>
          <div className="time-slots">
            {durations.map(d => {
              const fromH = parseInt(data.timeFrom.split(':')[0]);
              const toH = (fromH + d) % 24;
              const to = String(toH).padStart(2, '0') + ':00';
              const isSelected = data.timeTo === to;
              return (
                <button
                  key={d}
                  className={`time-slot ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectTime(data.timeFrom, to)}
                >
                  {d} ч
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        className="btn btn-primary"
        disabled={!data.timeFrom || !data.timeTo}
        onClick={onNext}
        style={{ marginTop: 16 }}
      >
        Продолжить
      </button>
    </div>
  );
}
