import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const getMe = () => api.get('/auth/me');

// Branches
export const getBranches = () => api.get('/branches');
export const getBranch = (id: number) => api.get(`/branches/${id}`);
export const createBranch = (data: any) => api.post('/branches', data);
export const updateBranch = (id: number, data: any) => api.put(`/branches/${id}`, data);

// Rooms
export const getRooms = (branchId?: number) =>
  api.get('/rooms', { params: { branchId } });
export const getRoom = (id: number) => api.get(`/rooms/${id}`);
export const createRoom = (data: any) => api.post('/rooms', data);
export const updateRoom = (id: number, data: any) => api.put(`/rooms/${id}`, data);

// Bookings
export const getBookings = (params?: any) => api.get('/bookings', { params });
export const getBooking = (id: number) => api.get(`/bookings/${id}`);
export const getCalendar = (branchId: number, dateFrom: string, dateTo: string) =>
  api.get('/bookings/calendar', { params: { branchId, dateFrom, dateTo } });
export const createBooking = (data: any) => api.post('/bookings', data);
export const updateBooking = (id: number, data: any) => api.put(`/bookings/${id}`, data);
export const getAvailableSlots = (params: any) =>
  api.get('/bookings/available-slots', { params });

// Pricing
export const getPricing = () => api.get('/pricing');
export const calculatePrice = (params: any) => api.get('/pricing/calculate', { params });
export const createPriceRule = (data: any) => api.post('/pricing', data);
export const updatePriceRule = (id: number, data: any) => api.put(`/pricing/${id}`, data);

// Users
export const getUsers = () => api.get('/users');
export const createUser = (data: any) => api.post('/users', data);
export const updateUser = (id: number, data: any) => api.put(`/users/${id}`, data);

// Promo Codes
export const getActivePromos = () => api.get('/promo-codes/active');
export const getPromoCodes = () => api.get('/promo-codes');
export const createPromoCode = (data: any) => api.post('/promo-codes', data);
export const updatePromoCode = (id: number, data: any) => api.put(`/promo-codes/${id}`, data);
export const deletePromoCode = (id: number) => api.delete(`/promo-codes/${id}`);

// Packages
export const getPackages = () => api.get('/packages');
export const createPackage = (data: any) => api.post('/packages', data);
export const updatePackage = (id: number, data: any) => api.put(`/packages/${id}`, data);

// Waitlist
export const getWaitlist = (params?: any) => api.get('/waitlist', { params });
export const updateWaitlistEntry = (id: number, data: any) => api.put(`/waitlist/${id}`, data);

// Notifications
export const getNotifications = (params?: any) => api.get('/notifications', { params });
export const getNotificationStats = () => api.get('/notifications/stats');

// Empty Slots
export const getEmptySlots = (date?: string) => api.get('/empty-slots', { params: date ? { date } : {} });

// Dashboard
export const getDashboardStats = (branchId?: number) =>
  api.get('/dashboard/stats', { params: branchId ? { branchId } : {} });

// Slot Config
export const getSlotConfig = () => api.get('/slot-config');
export const updateSlotConfig = (data: { startHour?: number; slotDuration?: number; gapHours?: number }) =>
  api.put('/slot-config', data);

// Analytics
export const getSourceAnalytics = (branchId?: number) =>
  api.get('/analytics/sources', { params: branchId ? { branchId } : {} });
export const getManagerAnalytics = (branchId?: number) =>
  api.get('/analytics/managers', { params: branchId ? { branchId } : {} });
export const getRoomAnalytics = (branchId?: number) =>
  api.get('/analytics/rooms', { params: branchId ? { branchId } : {} });
export const getCancellationAnalytics = (branchId?: number) =>
  api.get('/analytics/cancellations', { params: branchId ? { branchId } : {} });
