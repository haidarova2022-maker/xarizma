import { useEffect, useState } from 'react';
import { getBranches } from '../api';
import type { BookingData } from '../App';

interface Props {
  data: BookingData;
  update: (d: Partial<BookingData>) => void;
  onNext: () => void;
}

export default function BranchStep({ data, update, onNext }: Props) {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBranches()
      .then(({ data: list }) => setBranches(list))
      .finally(() => setLoading(false));
  }, []);

  const select = (branch: any) => {
    update({ branchId: branch.id, branchName: branch.name });
  };

  if (loading) {
    return <div className="step-content" style={{ textAlign: 'center', padding: 48 }}>Загрузка...</div>;
  }

  return (
    <div className="step-content">
      <h2 className="step-title">Выберите филиал</h2>
      {branches.map((b: any) => (
        <div
          key={b.id}
          className={`branch-card ${data.branchId === b.id ? 'selected' : ''}`}
          onClick={() => select(b)}
        >
          <h3>{b.name}</h3>
          <p>{b.address}</p>
          <p style={{ color: '#6C5CE7', fontWeight: 500, marginTop: 4 }}>
            м. {b.metro}
          </p>
        </div>
      ))}
      <button
        className="btn btn-primary"
        disabled={!data.branchId}
        onClick={onNext}
        style={{ marginTop: 8 }}
      >
        Продолжить
      </button>
    </div>
  );
}
