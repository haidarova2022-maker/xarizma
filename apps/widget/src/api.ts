import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: `${API_URL}/api` });

export const getBranches = () => api.get('/branches');
export const getRooms = (branchId: number) => api.get('/rooms', { params: { branchId } });
export const getAvailableSlots = (params: {
  branchId: number;
  date: string;
  guestCount?: number;
  category?: string;
}) => api.get('/bookings/available-slots', { params });
export const calculatePrice = (params: {
  category: string;
  startTime: string;
  endTime: string;
}) => api.get('/pricing/calculate', { params });
export const createBooking = (data: any) => api.post('/bookings', data);
export const createWaitlist = (data: any) => api.post('/waitlist', data);
export const getRoomsAllBranches = (params: {
  date: string;
  timeFrom: string;
  timeTo: string;
  guestCount: number;
  excludeBranchId: number;
}) => api.get('/rooms/available-other-branches', { params });
export const applyPromoCode = (code: string) => api.get('/promo-codes/validate', { params: { code } });
export const getPackages = () => api.get('/packages');
