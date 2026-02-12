import { useState } from 'react';
import BranchStep from './steps/BranchStep';
import DateStep from './steps/DateStep';
import TimeStep from './steps/TimeStep';
import RoomStep from './steps/RoomStep';
import ContactStep from './steps/ContactStep';
import ConfirmStep from './steps/ConfirmStep';
import SuccessStep from './steps/SuccessStep';

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
};

const TOTAL_STEPS = 6;

export default function App() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingData>(INITIAL_DATA);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const update = (partial: Partial<BookingData>) => {
    setData(prev => ({ ...prev, ...partial }));
  };

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(0, s - 1));

  const renderStep = () => {
    switch (step) {
      case 0: return <BranchStep data={data} update={update} onNext={next} />;
      case 1: return <DateStep data={data} update={update} onNext={next} />;
      case 2: return <TimeStep data={data} update={update} onNext={next} />;
      case 3: return <RoomStep data={data} update={update} onNext={next} />;
      case 4: return <ContactStep data={data} update={update} onNext={next} />;
      case 5: return <ConfirmStep data={data} onNext={(id: number) => { setBookingId(id); next(); }} />;
      case 6: return <SuccessStep bookingId={bookingId!} data={data} onReset={() => { setStep(0); setData(INITIAL_DATA); }} />;
      default: return null;
    }
  };

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
