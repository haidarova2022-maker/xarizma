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
