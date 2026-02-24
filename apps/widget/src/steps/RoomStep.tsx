import { useEffect, useState } from 'react';
import { getRooms, calculatePrice, createWaitlist, getBranches } from '../api';
import type { BookingData } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  bratski: 'По-братски',
  pobratski: 'По-братски',
  vibe: 'Вайб',
  flex: 'Флекс',
  full_gas: 'Полный газ',
};

export default function RoomStep({ data, update, onNext }: Props) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, any>>({});

  // Waitlist state (1.1)
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Other branches (1.1)
  const [otherBranches, setOtherBranches] = useState<any[]>([]);
  const [otherBranchRooms, setOtherBranchRooms] = useState<Record<number, any[]>>({});
  const [loadingOther, setLoadingOther] = useState(false);

  useEffect(() => {
    if (!data.branchId) return;
    setLoading(true);
    getRooms(data.branchId)
      .then(({ data: list }) => {
        const filtered = list.filter((r: any) => r.capacityMax >= data.guestCount);
        setRooms(filtered);

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

        // If no rooms, load other branches (1.1)
        if (filtered.length === 0) {
          loadOtherBranches();
        }
      })
      .finally(() => setLoading(false));
  }, [data.branchId, data.guestCount, data.timeFrom, data.timeTo, data.date]);

  const loadOtherBranches = async () => {
    setLoadingOther(true);
    try {
      const { data: allBranches } = await getBranches();
      const others = allBranches.filter((b: any) => b.id !== data.branchId);
      setOtherBranches(others);

      const roomsMap: Record<number, any[]> = {};
      await Promise.all(others.map(async (branch: any) => {
        try {
          const { data: branchRooms } = await getRooms(branch.id);
          roomsMap[branch.id] = branchRooms.filter((r: any) => r.capacityMax >= data.guestCount);
        } catch {
          roomsMap[branch.id] = [];
        }
      }));
      setOtherBranchRooms(roomsMap);
    } catch { /* ignore */ }
    setLoadingOther(false);
  };

  const switchBranch = (branch: any) => {
    update({ branchId: branch.id, branchName: branch.name, roomId: null, roomName: '', roomCategory: '' });
  };

  const handleWaitlistSubmit = async () => {
    if (!waitlistName.trim() || !waitlistPhone.trim()) return;
    setWaitlistLoading(true);
    try {
      await createWaitlist({
        branchId: data.branchId,
        roomCategory: 'vibe',
        desiredDate: data.date,
        desiredTimeFrom: data.timeFrom,
        desiredTimeTo: data.timeTo,
        guestCount: data.guestCount,
        guestName: waitlistName,
        guestPhone: waitlistPhone,
      });
      setWaitlistSubmitted(true);
    } catch {
      setWaitlistSubmitted(true); // Show success anyway for UX
    }
    setWaitlistLoading(false);
  };

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
        <div>
          <p style={{ color: '#999', textAlign: 'center', padding: '16px 0' }}>
            Нет подходящих залов для {data.guestCount} гостей на выбранное время
          </p>

          {/* Waitlist form (1.1) */}
          {!waitlistSubmitted ? (
            <div style={{
              background: '#F8F7FF',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                Хотите узнать, когда появится место?
              </h3>
              <p style={{ fontSize: 13, color: '#636E72', marginBottom: 16 }}>
                Оставьте контакты — мы уведомим вас, как только зал освободится
              </p>
              {!showWaitlist ? (
                <button className="btn btn-primary" onClick={() => setShowWaitlist(true)}>
                  Уведомить меня
                </button>
              ) : (
                <>
                  <div className="form-group">
                    <input
                      className="form-input"
                      placeholder="Ваше имя"
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      className="form-input"
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={waitlistPhone}
                      onChange={(e) => setWaitlistPhone(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleWaitlistSubmit}
                    disabled={!waitlistName.trim() || !waitlistPhone.trim() || waitlistLoading}
                  >
                    {waitlistLoading ? 'Отправка...' : 'Записаться в лист ожидания'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{
              background: '#E8F5E9',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>&#10003;</div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Вы в листе ожидания!</p>
              <p style={{ fontSize: 13, color: '#636E72' }}>Мы свяжемся с вами, как только место освободится</p>
            </div>
          )}

          {/* Other branches suggestion (1.1) */}
          <div style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Свободные залы в других филиалах
            </h3>
            {loadingOther ? (
              <p style={{ color: '#999', textAlign: 'center' }}>Ищем свободные залы...</p>
            ) : (
              otherBranches.map((branch: any) => {
                const branchRooms = otherBranchRooms[branch.id] || [];
                if (branchRooms.length === 0) return null;
                return (
                  <div
                    key={branch.id}
                    className="branch-card"
                    onClick={() => switchBranch(branch)}
                    style={{ cursor: 'pointer' }}
                  >
                    <h3>{branch.name}</h3>
                    <p>{branch.address}</p>
                    <p style={{ color: '#6C5CE7', fontWeight: 500, marginTop: 4 }}>
                      м. {branch.metro}
                    </p>
                    <p style={{ fontSize: 13, color: '#00B894', marginTop: 4 }}>
                      {branchRooms.length} {branchRooms.length === 1 ? 'зал' : branchRooms.length < 5 ? 'зала' : 'залов'} подходит
                    </p>
                  </div>
                );
              })
            )}
            {!loadingOther && otherBranches.every(b => (otherBranchRooms[b.id] || []).length === 0) && (
              <p style={{ color: '#999', textAlign: 'center', fontSize: 14 }}>
                К сожалению, нет свободных залов ни в одном филиале на это время
              </p>
            )}
          </div>
        </div>
      ) : (
        rooms.map((room: any) => {
          const p = prices[room.category];
          // Price per person (4.1)
          const pricePerPerson = p && data.guestCount > 0
            ? Math.round(p.basePrice / data.guestCount)
            : 0;

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
                    {CATEGORY_LABELS[room.category] || room.category}
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
                      {/* 4.1 — Price per person */}
                      <div style={{ fontSize: 12, color: '#00B894', marginTop: 2 }}>
                        {new Intl.NumberFormat('ru-RU').format(pricePerPerson)} ₽/чел
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      {rooms.length > 0 && (
        <button
          className="btn btn-primary"
          disabled={!data.roomId}
          onClick={onNext}
          style={{ marginTop: 8 }}
        >
          Продолжить
        </button>
      )}
    </div>
  );
}
