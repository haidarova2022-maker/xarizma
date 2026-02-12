import { useEffect, useState } from 'react';
import { getRooms, calculatePrice } from '../api';
import type { BookingData } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

export default function RoomStep({ data, update, onNext }: Props) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!data.branchId) return;
    setLoading(true);
    getRooms(data.branchId)
      .then(({ data: list }) => {
        const filtered = list.filter((r: any) => r.capacityMax >= data.guestCount);
        setRooms(filtered);
        // Calculate price for each category
        const cats = [...new Set(filtered.map((r: any) => r.category))];
        const fromH = parseInt(data.timeFrom.split(':')[0]);
        const toH = parseInt(data.timeTo.split(':')[0]);
        const startTime = new Date(data.date);
        startTime.setHours(fromH, 0, 0, 0);
        const endTime = new Date(data.date);
        endTime.setHours(toH, 0, 0, 0);
        if (toH <= fromH) endTime.setDate(endTime.getDate() + 1);

        Promise.all(cats.map((cat: any) =>
          calculatePrice({
            category: cat,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          }).then(({ data: p }) => ({ cat, price: p }))
        )).then(results => {
          const map: Record<string, any> = {};
          results.forEach(({ cat, price }) => { map[cat as string] = price; });
          setPrices(map);
        });
      })
      .finally(() => setLoading(false));
  }, [data.branchId, data.guestCount, data.timeFrom, data.timeTo, data.date]);

  const selectRoom = (room: any) => {
    const p = prices[room.category];
    update({
      roomId: room.id,
      roomName: room.name,
      roomCategory: room.category,
      pricePerHour: p?.pricePerHour || 0,
      totalPrice: p?.basePrice || 0,
      hours: p?.hours || 0,
    });
  };

  if (loading) {
    return <div className="step-content" style={{ textAlign: 'center', padding: 48 }}>Подбираем залы...</div>;
  }

  return (
    <div className="step-content">
      <h2 className="step-title">Выберите зал</h2>
      {rooms.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 32 }}>
          Нет подходящих залов для {data.guestCount} гостей
        </p>
      ) : (
        rooms.map((room: any) => {
          const p = prices[room.category];
          return (
            <div
              key={room.id}
              className={`room-card ${data.roomId === room.id ? 'selected' : ''}`}
              onClick={() => selectRoom(room)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3>{room.name}</h3>
                  <p>До {room.capacityMax} гостей · {room.areaSqm} м²</p>
                  <span className={`category-tag category-${room.category}`}>
                    {CATEGORY_LABELS[room.category]}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {p && (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#6C5CE7' }}>
                        {new Intl.NumberFormat('ru-RU').format(p.basePrice)} ₽
                      </div>
                      <div style={{ fontSize: 13, color: '#999' }}>
                        {new Intl.NumberFormat('ru-RU').format(p.pricePerHour)} ₽/ч
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      <button
        className="btn btn-primary"
        disabled={!data.roomId}
        onClick={onNext}
        style={{ marginTop: 8 }}
      >
        Продолжить
      </button>
    </div>
  );
}
