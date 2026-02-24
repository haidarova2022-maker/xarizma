import { useEffect, useState } from 'react';
import { getPackages } from '../api';
import type { BookingData, PackageItem } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

const FALLBACK_PACKAGES: PackageItem[] = [
  {
    id: -1,
    name: 'День рождения',
    description: 'Световое оформление, микрофон для ведущего, шары',
    priceModifier: 3000,
    includes: { lights: true, microphone: true, balloons: true },
  },
  {
    id: -2,
    name: 'Корпоратив',
    description: 'Световое оформление, игровая приставка, расширенное меню',
    priceModifier: 5000,
    includes: { lights: true, console: true, extendedMenu: true },
  },
  {
    id: -3,
    name: 'Просто тусовка',
    description: 'Дополнительный микрофон, игровая приставка',
    priceModifier: 1500,
    includes: { microphone: true, console: true },
  },
];

export default function PackageStep({ data, update, onNext }: Props) {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPackages()
      .then(({ data: list }) => {
        const active = list.filter((p: any) => p.isActive !== false);
        setPackages(active.length > 0 ? active : FALLBACK_PACKAGES);
      })
      .catch(() => setPackages(FALLBACK_PACKAGES))
      .finally(() => setLoading(false));
  }, []);

  const selectPackage = (pkg: PackageItem | null) => {
    update({ selectedPackage: pkg });
  };

  const isSelected = (pkg: PackageItem) => data.selectedPackage?.id === pkg.id;

  if (loading) {
    return <div className="step-content" style={{ textAlign: 'center', padding: 48 }}>Загрузка пакетов...</div>;
  }

  return (
    <div className="step-content">
      <h2 className="step-title">Добавить пакет?</h2>
      <p style={{ color: '#636E72', fontSize: 14, marginBottom: 16 }}>
        Выберите пакет для вашего мероприятия или пропустите этот шаг
      </p>

      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className={`room-card ${isSelected(pkg) ? 'selected' : ''}`}
          onClick={() => selectPackage(isSelected(pkg) ? null : pkg)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>{pkg.name}</h3>
              <p style={{ fontSize: 13, color: '#636E72' }}>{pkg.description}</p>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#6C5CE7' }}>
                +{new Intl.NumberFormat('ru-RU').format(pkg.priceModifier)} ₽
              </div>
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          className="btn btn-outline"
          onClick={() => { selectPackage(null); onNext(); }}
        >
          Пропустить
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
        >
          {data.selectedPackage ? 'Продолжить' : 'Пропустить'}
        </button>
      </div>
    </div>
  );
}
