import { useState } from 'react';
import BranchStep from './steps/BranchStep';
import DateStep from './steps/DateStep';
import TimeStep from './steps/TimeStep';
import RoomStep from './steps/RoomStep';
import PackageStep from './steps/PackageStep';
import ContactStep from './steps/ContactStep';
import ConfirmStep from './steps/ConfirmStep';
import SuccessStep from './steps/SuccessStep';
import QuickBookingStep from './steps/QuickBookingStep';

export interface PackageItem {
  id: number;
  name: string;
  description: string;
  priceModifier: number;
  includes: Record<string, any>;
}

export interface BookingData {
  branchId: number | null;
  branchName: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  roomId: number | null;
  roomName: string;
  roomCategory: string;
  guestCount: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestComment: string;
  pricePerHour: number;
  totalPrice: number;
  hours: number;
  selectedPackage: PackageItem | null;
  promoCode: string;
  promoDiscount: number;
  bonusPoints: number;
  useBonusPoints: number;
}

const INITIAL_DATA: BookingData = {
  branchId: null,
  branchName: '',
  date: '',
  timeFrom: '',
  timeTo: '',
  roomId: null,
  roomName: '',
  roomCategory: '',
  guestCount: 2,
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  guestComment: '',
  pricePerHour: 0,
  totalPrice: 0,
  hours: 0,
  selectedPackage: null,
  promoCode: '',
  promoDiscount: 0,
  bonusPoints: 0,
  useBonusPoints: 0,
};

const TOTAL_STEPS = 7;

export default function App() {
  const [mode, setMode] = useState<'choose' | 'quick' | 'full'>('choose');
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingData>(INITIAL_DATA);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const update = (partial: Partial<BookingData>) => {
    setData(prev => ({ ...prev, ...partial }));
  };

  const next = () => setStep(s => s + 1);
  const back = () => {
    if (step === 0) {
      setMode('choose');
    } else {
      setStep(s => Math.max(0, s - 1));
    }
  };

  const resetAll = () => {
    setStep(0);
    setData(INITIAL_DATA);
    setMode('choose');
    setBookingId(null);
  };

  // Quick booking goes straight to ContactStep (step 5) after selecting a room
  const handleQuickNext = () => {
    setMode('full');
    setStep(5); // Jump to ContactStep
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <BranchStep data={data} update={update} onNext={next} />;
      case 1: return <DateStep data={data} update={update} onNext={next} />;
      case 2: return <TimeStep data={data} update={update} onNext={next} />;
      case 3: return <RoomStep data={data} update={update} onNext={next} />;
      case 4: return <PackageStep data={data} update={update} onNext={next} />;
      case 5: return <ContactStep data={data} update={update} onNext={next} />;
      case 6: return <ConfirmStep data={data} onNext={(id: number) => { setBookingId(id); next(); }} />;
      case 7: return <SuccessStep bookingId={bookingId!} data={data} onReset={resetAll} />;
      default: return null;
    }
  };

  // Mode chooser screen (1.2)
  if (mode === 'choose') {
    return (
      <div className="widget-container">
        <div className="widget-header">
          <h1>Харизма</h1>
          <p>Бронирование караоке-зала</p>
        </div>
        <div className="step-content">
          <h2 className="step-title">Как хотите забронировать?</h2>

          <div
            className="branch-card"
            onClick={() => { setMode('quick'); setStep(0); }}
            style={{ cursor: 'pointer' }}
          >
            <h3 style={{ color: '#6C5CE7' }}>Быстрая бронь</h3>
            <p>Укажите дату, время и количество гостей — мы подберём лучшие варианты</p>
          </div>

          <div
            className="branch-card"
            onClick={() => { setMode('full'); setStep(0); }}
            style={{ cursor: 'pointer' }}
          >
            <h3 style={{ color: '#6C5CE7' }}>Подробное бронирование</h3>
            <p>Выберите филиал, зал и время самостоятельно шаг за шагом</p>
          </div>
        </div>
      </div>
    );
  }

  // Quick booking mode (1.2)
  if (mode === 'quick' && step === 0) {
    return (
      <div className="widget-container">
        <div className="widget-header">
          <h1>Харизма</h1>
          <p>Бронирование караоке-зала</p>
        </div>
        <QuickBookingStep
          data={data}
          update={update}
          onNext={handleQuickNext}
          onSwitchToFull={() => { setMode('full'); setStep(0); }}
        />
        <div className="nav-buttons">
          <button className="btn btn-outline" onClick={() => setMode('choose')}>Назад</button>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-container">
      <div className="widget-header">
        <h1>Харизма</h1>
        <p>Бронирование караоке-зала</p>
      </div>

      {step < TOTAL_STEPS && (
        <div className="step-indicator">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
            />
          ))}
        </div>
      )}

      {renderStep()}

      {step > 0 && step < TOTAL_STEPS && (
        <div className="nav-buttons">
          <button className="btn btn-outline" onClick={back}>Назад</button>
        </div>
      )}
    </div>
  );
}
