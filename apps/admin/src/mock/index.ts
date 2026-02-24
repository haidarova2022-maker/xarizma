import MockAdapter from 'axios-mock-adapter';
import api from '../api/client';
import { branches } from './data/branches';
import { rooms } from './data/rooms';
import { priceRules } from './data/pricing';
import { users } from './data/users';
import { bookings } from './data/bookings';

const mock = new MockAdapter(api, { delayResponse: 200 });

const adminUser = { id: 1, email: 'admin@xarizma.ru', name: 'Администратор', role: 'admin', branchId: null, isActive: true };

let nextBookingId = bookings.length + 1;
let nextRoomId = rooms.length + 1;
let nextBranchId = branches.length + 1;
let nextUserId = users.length + 1;

// ==================== AUTH ====================
mock.onPost('/auth/login').reply((config) => {
  const { email, password } = JSON.parse(config.data);
  if (email === 'admin@xarizma.ru' && password === 'Admin123!') {
    return [200, { accessToken: 'mock-jwt-token', user: adminUser }];
  }
  return [401, { message: 'Неверный email или пароль' }];
});

mock.onGet('/auth/me').reply(() => [200, adminUser]);

// ==================== BRANCHES ====================
mock.onGet('/branches').reply(() => [200, branches]);

mock.onGet(/\/branches\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/branches\/(\d+)/)![1]);
  const b = branches.find(x => x.id === id);
  return b ? [200, b] : [404];
});

mock.onPost('/branches').reply((config) => {
  const data = JSON.parse(config.data);
  const b = { ...data, id: nextBranchId++, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  branches.push(b);
  return [201, b];
});

mock.onPut(/\/branches\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/branches\/(\d+)/)![1]);
  const idx = branches.findIndex(x => x.id === id);
  if (idx === -1) return [404];
  branches[idx] = { ...branches[idx], ...JSON.parse(config.data), updatedAt: new Date().toISOString() };
  return [200, branches[idx]];
});

// ==================== ROOMS ====================
mock.onGet(/\/rooms\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/rooms\/(\d+)/)![1]);
  return [200, rooms.find(x => x.id === id)];
});

mock.onGet('/rooms').reply((config) => {
  const branchId = config.params?.branchId ? Number(config.params.branchId) : null;
  const filtered = branchId ? rooms.filter(r => r.branchId === branchId) : rooms;
  return [200, filtered];
});

mock.onPost('/rooms').reply((config) => {
  const data = JSON.parse(config.data);
  const r = { ...data, id: nextRoomId++, isActive: true, hasKaraoke: true, equipment: {}, photoUrls: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  rooms.push(r);
  return [201, r];
});

mock.onPut(/\/rooms\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/rooms\/(\d+)/)![1]);
  const idx = rooms.findIndex(x => x.id === id);
  if (idx === -1) return [404];
  rooms[idx] = { ...rooms[idx], ...JSON.parse(config.data), updatedAt: new Date().toISOString() };
  return [200, rooms[idx]];
});

// ==================== BOOKINGS ====================
mock.onGet('/bookings/calendar').reply((config) => {
  const { branchId, dateFrom, dateTo } = config.params || {};
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const filtered = bookings
    .filter(b => b.branchId === Number(branchId))
    .filter(b => new Date(b.startTime) >= from && new Date(b.startTime) <= to)
    .map(b => {
      const room = rooms.find(r => r.id === b.roomId);
      return { ...b, roomName: room?.name || '', roomNumber: room?.number || 0 };
    });
  return [200, filtered];
});

mock.onGet('/bookings/available-slots').reply(() => [200, []]);

mock.onGet(/\/bookings\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/bookings\/(\d+)/)![1]);
  return [200, bookings.find(x => x.id === id)];
});

mock.onGet('/bookings').reply((config) => {
  let filtered = [...bookings];
  const p = config.params || {};
  if (p.branchId) filtered = filtered.filter(b => b.branchId === Number(p.branchId));
  if (p.status) filtered = filtered.filter(b => b.status === p.status);
  if (p.source) filtered = filtered.filter(b => b.source === p.source);
  if (p.dateFrom) filtered = filtered.filter(b => new Date(b.startTime) >= new Date(p.dateFrom));
  if (p.dateTo) filtered = filtered.filter(b => new Date(b.startTime) <= new Date(p.dateTo));
  return [200, filtered];
});

mock.onPost('/bookings').reply((config) => {
  const data = JSON.parse(config.data);
  const room = rooms.find(r => r.id === data.roomId);
  const rule = priceRules.find(r => r.category === room?.category);
  const hours = Math.abs(new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 3600000;
  const basePrice = Math.round((rule?.pricePerHour || 3000) * hours);

  let discountAmount = 0;
  if (data.promoCodeId) {
    const promo = promoCodes.find(p => p.id === data.promoCodeId);
    if (promo) {
      if (promo.discountType === 'percentage') {
        discountAmount = Math.round(basePrice * promo.discountValue / 100);
      } else {
        discountAmount = Math.min(promo.discountValue, basePrice);
      }
      promo.usageCount = (promo.usageCount || 0) + 1;
    }
  }

  const totalPrice = basePrice - discountAmount;
  const b = {
    ...data, id: nextBookingId++,
    status: data.bookingType === 'walkin' ? 'walkin' : 'new',
    basePrice, discountAmount, totalPrice,
    prepaymentAmount: 0, paymentStatus: 'none',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  bookings.push(b);
  return [201, b];
});

mock.onPut(/\/bookings\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/bookings\/(\d+)/)![1]);
  const idx = bookings.findIndex(x => x.id === id);
  if (idx === -1) return [404];
  bookings[idx] = { ...bookings[idx], ...JSON.parse(config.data), updatedAt: new Date().toISOString() };
  return [200, bookings[idx]];
});

// ==================== PRICING ====================
mock.onGet('/pricing/calculate').reply((config) => {
  const { category, startTime, endTime } = config.params || {};
  const rule = priceRules.find(r => r.category === category);
  const hours = Math.abs(new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000;
  const pricePerHour = rule?.pricePerHour || 3000;
  return [200, { pricePerHour, hours: Math.round(hours * 10) / 10, basePrice: Math.round(pricePerHour * hours) }];
});

mock.onGet('/pricing').reply(() => [200, priceRules]);

mock.onPost('/pricing').reply((config) => {
  const data = JSON.parse(config.data);
  const r = { ...data, id: priceRules.length + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  priceRules.push(r);
  return [201, r];
});

mock.onPut(/\/pricing\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/pricing\/(\d+)/)![1]);
  const idx = priceRules.findIndex(x => x.id === id);
  if (idx === -1) return [404];
  priceRules[idx] = { ...priceRules[idx], ...JSON.parse(config.data), updatedAt: new Date().toISOString() };
  return [200, priceRules[idx]];
});

// ==================== USERS ====================
mock.onGet('/users').reply(() => [200, users]);

mock.onPost('/users').reply((config) => {
  const data = JSON.parse(config.data);
  const { password, ...rest } = data;
  const u = { ...rest, id: nextUserId++, isActive: true, lastLogin: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  users.push(u);
  return [201, u];
});

mock.onPut(/\/users\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/users\/(\d+)/)![1]);
  const idx = users.findIndex(x => x.id === id);
  if (idx === -1) return [404];
  const { password, ...rest } = JSON.parse(config.data);
  users[idx] = { ...users[idx], ...rest, updatedAt: new Date().toISOString() };
  return [200, users[idx]];
});

// ==================== PROMO CODES ====================
let promoCodes: any[] = [
  { id: 1, code: 'WELCOME10', discountType: 'percentage', discountValue: 10, value: 10, type: 'percentage', usageLimit: 100, usageCount: 23, isActive: true, validFrom: null, validTo: null, createdAt: '2025-01-01T00:00:00Z' },
  { id: 2, code: 'BIRTHDAY', discountType: 'fixed', discountValue: 2000, value: 2000, type: 'fixed', usageLimit: null, usageCount: 45, isActive: true, validFrom: null, validTo: null, createdAt: '2025-01-01T00:00:00Z' },
  { id: 3, code: 'SUMMER25', discountType: 'percentage', discountValue: 25, value: 25, type: 'percentage', usageLimit: 50, usageCount: 50, isActive: false, validFrom: '2025-06-01T00:00:00Z', validTo: '2025-08-31T00:00:00Z', createdAt: '2025-06-01T00:00:00Z' },
];
let nextPromoId = 4;

mock.onGet('/promo-codes/active').reply(() => {
  const now = new Date();
  const active = promoCodes.filter(p => {
    if (!p.isActive) return false;
    if (p.usageLimit && p.usageCount >= p.usageLimit) return false;
    if (p.validFrom && new Date(p.validFrom) > now) return false;
    if (p.validTo && new Date(p.validTo) < now) return false;
    return true;
  });
  return [200, active];
});

mock.onGet('/promo-codes').reply(() => [200, promoCodes]);
mock.onPost('/promo-codes').reply((config) => {
  const data = JSON.parse(config.data);
  const p = { ...data, id: nextPromoId++, usageCount: 0, createdAt: new Date().toISOString() };
  promoCodes.push(p);
  return [201, p];
});
mock.onPut(/\/promo-codes\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/promo-codes\/(\d+)/)![1]);
  const idx = promoCodes.findIndex(x => x.id === id);
  if (idx === -1) return [404];
  promoCodes[idx] = { ...promoCodes[idx], ...JSON.parse(config.data) };
  return [200, promoCodes[idx]];
});
mock.onDelete(/\/promo-codes\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/promo-codes\/(\d+)/)![1]);
  promoCodes = promoCodes.filter(x => x.id !== id);
  return [200];
});

// ==================== PACKAGES ====================
let packages: any[] = [
  { id: 1, name: 'День рождения', description: 'Световое оформление, микрофон для ведущего, шары', priceModifier: 3000, isActive: true, includes: { lights: true, microphone: true, balloons: true }, createdAt: '2025-01-01T00:00:00Z' },
  { id: 2, name: 'Корпоратив', description: 'Световое оформление, игровая приставка, расширенное меню', priceModifier: 5000, isActive: true, includes: { lights: true, console: true, extendedMenu: true }, createdAt: '2025-01-01T00:00:00Z' },
  { id: 3, name: 'Просто тусовка', description: 'Дополнительный микрофон, игровая приставка', priceModifier: 1500, isActive: true, includes: { microphone: true, console: true }, createdAt: '2025-01-01T00:00:00Z' },
];
let nextPkgId = 4;

mock.onGet('/packages').reply(() => [200, packages]);
mock.onPost('/packages').reply((config) => {
  const data = JSON.parse(config.data);
  const p = { ...data, id: nextPkgId++, createdAt: new Date().toISOString() };
  packages.push(p);
  return [201, p];
});
mock.onPut(/\/packages\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/packages\/(\d+)/)![1]);
  const idx = packages.findIndex(x => x.id === id);
  if (idx === -1) return [404];
  packages[idx] = { ...packages[idx], ...JSON.parse(config.data) };
  return [200, packages[idx]];
});

// ==================== WAITLIST ====================
let waitlist: any[] = [
  { id: 1, branchId: 1, roomCategory: 'full_gas', desiredDate: new Date().toISOString(), desiredTimeFrom: '19:00', desiredTimeTo: '22:00', guestCount: 20, guestName: 'Кирилл Белов', guestPhone: '+7 (916) 111-22-33', status: 'active', notifiedAt: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, branchId: 1, roomCategory: 'flex', desiredDate: new Date().toISOString(), desiredTimeFrom: '20:00', desiredTimeTo: '23:00', guestCount: 12, guestName: 'Алина Тарасова', guestPhone: '+7 (925) 444-55-66', status: 'active', notifiedAt: null, createdAt: new Date(Date.now() - 43200000).toISOString() },
  { id: 3, branchId: 1, roomCategory: 'vibe', desiredDate: new Date(Date.now() + 86400000).toISOString(), desiredTimeFrom: '18:00', desiredTimeTo: '21:00', guestCount: 8, guestName: 'Диана Семёнова', guestPhone: '+7 (977) 222-33-44', status: 'active', notifiedAt: null, createdAt: new Date(Date.now() - 21600000).toISOString() },
  { id: 4, branchId: 2, roomCategory: 'vibe', desiredDate: new Date(Date.now() - 172800000).toISOString(), desiredTimeFrom: '18:00', desiredTimeTo: '21:00', guestCount: 6, guestName: 'Олег Сидоров', guestPhone: '+7 (903) 777-88-99', status: 'notified', notifiedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 5, branchId: 2, roomCategory: 'full_gas', desiredDate: new Date().toISOString(), desiredTimeFrom: '20:00', desiredTimeTo: '23:00', guestCount: 18, guestName: 'Роман Егоров', guestPhone: '+7 (985) 555-66-77', status: 'active', notifiedAt: null, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 6, branchId: 3, roomCategory: 'flex', desiredDate: new Date(Date.now() + 86400000).toISOString(), desiredTimeFrom: '19:00', desiredTimeTo: '22:00', guestCount: 14, guestName: 'Светлана Данилова', guestPhone: '+7 (926) 888-99-00', status: 'active', notifiedAt: null, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 7, branchId: 4, roomCategory: 'full_gas', desiredDate: new Date().toISOString(), desiredTimeFrom: '17:00', desiredTimeTo: '20:00', guestCount: 16, guestName: 'Артур Киселёв', guestPhone: '+7 (915) 111-00-99', status: 'booked', notifiedAt: new Date(Date.now() - 43200000).toISOString(), createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: 8, branchId: 1, roomCategory: 'bratski', desiredDate: new Date(Date.now() - 86400000).toISOString(), desiredTimeFrom: '15:00', desiredTimeTo: '18:00', guestCount: 4, guestName: 'Николай Григорьев', guestPhone: '+7 (903) 345-67-89', status: 'expired', notifiedAt: null, createdAt: new Date(Date.now() - 432000000).toISOString() },
];

mock.onGet('/waitlist').reply((config) => {
  const branchId = config.params?.branchId ? Number(config.params.branchId) : null;
  const filtered = branchId ? waitlist.filter(w => w.branchId === branchId) : waitlist;
  return [200, filtered];
});
mock.onPost('/waitlist').reply((config) => {
  const data = JSON.parse(config.data);
  const w = { ...data, id: waitlist.length + 1, status: 'active', notifiedAt: null, createdAt: new Date().toISOString() };
  waitlist.push(w);
  return [201, w];
});
mock.onPut(/\/waitlist\/(\d+)/).reply((config) => {
  const id = parseInt(config.url!.match(/\/waitlist\/(\d+)/)![1]);
  const idx = waitlist.findIndex(x => x.id === id);
  if (idx === -1) return [404];
  waitlist[idx] = { ...waitlist[idx], ...JSON.parse(config.data) };
  if (waitlist[idx].status === 'notified') waitlist[idx].notifiedAt = new Date().toISOString();
  return [200, waitlist[idx]];
});

// ==================== NOTIFICATIONS ====================
const notifications = [
  { id: 1, bookingId: 1, channel: 'sms', template: 'booking_confirmed', status: 'delivered', sentAt: new Date(Date.now() - 86400000).toISOString(), errorMessage: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, bookingId: 1, channel: 'email', template: 'payment_received', status: 'delivered', sentAt: new Date(Date.now() - 86400000).toISOString(), errorMessage: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, bookingId: 4, channel: 'sms', template: 'booking_created', status: 'sent', sentAt: new Date(Date.now() - 43200000).toISOString(), errorMessage: null, createdAt: new Date(Date.now() - 43200000).toISOString() },
  { id: 4, bookingId: 6, channel: 'sms', template: 'booking_reminder', status: 'pending', sentAt: null, errorMessage: null, createdAt: new Date().toISOString() },
  { id: 5, bookingId: 9, channel: 'sms', template: 'booking_cancelled', status: 'delivered', sentAt: new Date(Date.now() - 259200000).toISOString(), errorMessage: null, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 6, bookingId: 10, channel: 'email', template: 'booking_confirmed', status: 'failed', sentAt: null, errorMessage: 'Invalid email address', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 7, bookingId: null, channel: 'sms', template: 'waitlist_available', status: 'sent', sentAt: new Date(Date.now() - 86400000).toISOString(), errorMessage: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

mock.onGet('/notifications/stats').reply(() => [200, { total: notifications.length, sent: 4, pending: 1, failed: 1 }]);
mock.onGet('/notifications').reply((config) => {
  let filtered = [...notifications];
  if (config.params?.channel) filtered = filtered.filter(n => n.channel === config.params.channel);
  if (config.params?.status) filtered = filtered.filter(n => n.status === config.params.status);
  return [200, filtered];
});

// ==================== SLOT CONFIG ====================
let slotConfig = { startHour: 9, slotDuration: 3, gapHours: 1 };

mock.onGet('/slot-config').reply(() => [200, slotConfig]);
mock.onPut('/slot-config').reply((config) => {
  slotConfig = { ...slotConfig, ...JSON.parse(config.data) };
  return [200, slotConfig];
});

// ==================== EMPTY SLOTS ====================
function getSlotPrice(category: string, date: Date, timeFrom: string): number {
  const hour = parseInt(timeFrom.split(':')[0], 10);
  const dow = date.getDay();
  let dayType: string;
  if (dow === 0) dayType = 'sunday';
  else if (dow === 6) dayType = 'saturday';
  else if (dow === 5) dayType = hour < 17 ? 'friday_day' : 'friday_evening';
  else dayType = hour < 17 ? 'weekday_day' : 'weekday_evening';
  const rule = priceRules.find(r => r.category === category && r.dayType === dayType);
  return rule?.pricePerHour || 0;
}

function buildEmptySlots() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const raw = [
    { roomName: 'Зал 1', category: 'bratski', branchName: 'Сретенка', branchId: 1, dateObj: today, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 7', category: 'full_gas', branchName: 'Сретенка', branchId: 1, dateObj: today, timeFrom: '18:00', timeTo: '22:00' },
    { roomName: 'Зал 2', category: 'bratski', branchName: 'Сретенка', branchId: 1, dateObj: tomorrow, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 1', category: 'bratski', branchName: 'Бауманская', branchId: 2, dateObj: today, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 4', category: 'vibe', branchName: 'Бауманская', branchId: 2, dateObj: today, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 5', category: 'vibe', branchName: 'Бауманская', branchId: 2, dateObj: tomorrow, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 1', category: 'bratski', branchName: 'Новослободская', branchId: 3, dateObj: today, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 7', category: 'full_gas', branchName: 'Новослободская', branchId: 3, dateObj: today, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 5', category: 'flex', branchName: 'Новослободская', branchId: 3, dateObj: tomorrow, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 1', category: 'bratski', branchName: 'Лубянка', branchId: 4, dateObj: today, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'Зал 4', category: 'flex', branchName: 'Лубянка', branchId: 4, dateObj: today, timeFrom: '14:00', timeTo: '18:00' },
    { roomName: 'VIP Зал', category: 'full_gas', branchName: 'Рублёвка', branchId: 5, dateObj: tomorrow, timeFrom: '16:00', timeTo: '20:00' },
    { roomName: 'Зал 1', category: 'bratski', branchName: 'Рублёвка', branchId: 5, dateObj: dayAfter, timeFrom: '14:00', timeTo: '18:00' },
  ];

  return raw.map(({ dateObj, ...rest }) => {
    const hours = (parseInt(rest.timeTo.split(':')[0], 10) - parseInt(rest.timeFrom.split(':')[0], 10));
    const pricePerHour = getSlotPrice(rest.category, dateObj, rest.timeFrom);
    return { ...rest, date: dateObj.toISOString(), pricePerHour, totalPrice: pricePerHour * hours };
  });
}

mock.onGet('/empty-slots').reply((config) => {
  const all = buildEmptySlots();
  const dateParam = config.params?.date;
  if (dateParam) {
    const filterDate = new Date(dateParam);
    const filtered = all.filter(s => {
      const sd = new Date(s.date);
      return sd.getFullYear() === filterDate.getFullYear() &&
             sd.getMonth() === filterDate.getMonth() &&
             sd.getDate() === filterDate.getDate();
    });
    return [200, filtered];
  }
  return [200, all];
});

// ==================== DASHBOARD STATS ====================
mock.onGet('/dashboard/stats').reply((config) => {
  const branchId = config.params?.branchId ? Number(config.params.branchId) : null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const active = bookings.filter((b: any) => {
    if (b.status === 'cancelled') return false;
    if (branchId && b.branchId !== branchId) return false;
    return true;
  });

  const monthBookings = active.filter(b => new Date(b.startTime) >= monthStart);
  const todayBookings = active.filter(b => {
    const s = new Date(b.startTime);
    return s >= todayStart && s < todayEnd;
  });

  const bookingsMonth = monthBookings.length;
  const bookingsToday = todayBookings.length;
  const guestsMonth = monthBookings.reduce((s, b: any) => s + b.guestCount, 0);
  const guestsToday = todayBookings.reduce((s, b: any) => s + b.guestCount, 0);

  // Revenue
  const revenueMonth = monthBookings.reduce((s, b: any) => s + (b.totalPrice || 0), 0);
  const avgCheck = bookingsMonth > 0 ? Math.round(revenueMonth / bookingsMonth) : 0;

  // Mock LFL (like-for-like vs last year same month)
  const bookingsLastYear = Math.max(1, Math.round(bookingsMonth * 0.82));
  const guestsLastYear = Math.max(1, Math.round(guestsMonth * 0.78));
  const revenueLastYear = Math.max(1, Math.round(revenueMonth * 0.85));
  const avgCheckLastYear = bookingsLastYear > 0 ? Math.round(revenueLastYear / bookingsLastYear) : 0;

  const bookingsLfl = bookingsLastYear > 0 ? Math.round(((bookingsMonth - bookingsLastYear) / bookingsLastYear) * 100) : 0;
  const guestsLfl = guestsLastYear > 0 ? Math.round(((guestsMonth - guestsLastYear) / guestsLastYear) * 100) : 0;
  const revenueLfl = revenueLastYear > 0 ? Math.round(((revenueMonth - revenueLastYear) / revenueLastYear) * 100) : 0;
  const avgCheckLfl = avgCheckLastYear > 0 ? Math.round(((avgCheck - avgCheckLastYear) / avgCheckLastYear) * 100) : 0;

  // Plan (mock: plan = last year * 1.2 growth target)
  const revenuePlan = Math.round(revenueLastYear * 1.2);
  const avgCheckPlan = Math.round(avgCheckLastYear * 1.1);

  // Marketing / leads (mock: leads ≈ bookings / conversion rate)
  const conversionRate = 0.069; // 6.9%
  const leadsMonth = Math.max(1, Math.round(bookingsMonth / conversionRate));
  const leadsToday = Math.max(1, Math.round(bookingsToday / conversionRate));
  const leadsLastYear = Math.max(1, Math.round(leadsMonth * 0.85));
  const leadsLfl = Math.round(((leadsMonth - leadsLastYear) / leadsLastYear) * 100);
  const conversionLastYear = bookingsLastYear > 0 && leadsLastYear > 0
    ? (bookingsLastYear / leadsLastYear * 100) : 0;

  return [200, {
    bookingsMonth,
    bookingsToday,
    guestsMonth,
    guestsToday,
    bookingsLfl,
    guestsLfl,
    bookingsLastYear,
    guestsLastYear,
    revenueMonth,
    revenueLastYear,
    revenueLfl,
    revenuePlan,
    avgCheck,
    avgCheckLastYear,
    avgCheckLfl,
    avgCheckPlan,
    leadsMonth,
    leadsToday,
    leadsLastYear,
    leadsLfl,
    conversionRate: +(conversionRate * 100).toFixed(1),
    conversionLastYear: +conversionLastYear.toFixed(1),
  }];
});

// ==================== ANALYTICS ====================

// Source Analytics
mock.onGet('/analytics/sources').reply((config) => {
  const branchId = config.params?.branchId ? Number(config.params.branchId) : null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const active = bookings.filter((b: any) => {
    if (b.status === 'cancelled') return false;
    if (branchId && b.branchId !== branchId) return false;
    return new Date(b.startTime) >= monthStart;
  });

  const sources = ['widget', 'admin', 'phone', 'walkin'];
  const data = sources.map(source => {
    const sb = active.filter((b: any) => b.source === source);
    const count = sb.length;
    const revenue = sb.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const avgCheck = count > 0 ? Math.round(revenue / count) : 0;
    const lastYear = Math.max(1, Math.round(count * 0.8));
    const lfl = Math.round(((count - lastYear) / lastYear) * 100);
    return { source, bookings: count, revenue, avgCheck, lfl, lastYearBookings: lastYear };
  });

  return [200, data];
});

// Manager Analytics
mock.onGet('/analytics/managers').reply((config) => {
  const branchId = config.params?.branchId ? Number(config.params.branchId) : null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const active = bookings.filter((b: any) => {
    if (b.status === 'cancelled') return false;
    if (branchId && b.branchId !== branchId) return false;
    return new Date(b.startTime) >= monthStart;
  });

  const managerIds = [...new Set(active.map((b: any) => b.createdBy).filter(Boolean))];
  const data = managerIds.map(mId => {
    const user = users.find(u => u.id === mId);
    const mb = active.filter((b: any) => b.createdBy === mId);
    const count = mb.length;
    const revenue = mb.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const avgCheck = count > 0 ? Math.round(revenue / count) : 0;
    const plan = Math.round(revenue * 1.3);
    const planPct = plan > 0 ? Math.round((revenue / plan) * 100) : 0;
    return {
      managerId: mId,
      managerName: user?.name || 'Неизвестный',
      bookings: count,
      revenue,
      avgCheck,
      plan,
      planPct,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return [200, data];
});

// Room Analytics
mock.onGet('/analytics/rooms').reply((config) => {
  const branchId = config.params?.branchId ? Number(config.params.branchId) : null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const active = bookings.filter((b: any) => {
    if (b.status === 'cancelled') return false;
    if (branchId && b.branchId !== branchId) return false;
    return new Date(b.startTime) >= monthStart;
  });

  const branchRooms = branchId ? rooms.filter(r => r.branchId === branchId) : rooms;
  const step = slotConfig.slotDuration + slotConfig.gapHours;
  const slotsPerDay = Math.floor(16 / step);
  const daysInMonth = now.getDate();

  const data = branchRooms.map(room => {
    const rb = active.filter((b: any) => b.roomId === room.id);
    const count = rb.length;
    const revenue = rb.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
    const hoursSold = rb.reduce((s: number, b: any) => {
      return s + Math.abs(new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3600000;
    }, 0);
    const avgCheck = count > 0 ? Math.round(revenue / count) : 0;
    const totalSlots = slotsPerDay * daysInMonth;
    const loadPct = totalSlots > 0 ? Math.round((count / totalSlots) * 100) : 0;

    return {
      roomId: room.id,
      roomName: room.name,
      category: room.category,
      bookings: count,
      hoursSold: Math.round(hoursSold),
      revenue,
      avgCheck,
      loadPct,
    };
  });

  return [200, data];
});

// Cancellation Analytics
mock.onGet('/analytics/cancellations').reply((config) => {
  const branchId = config.params?.branchId ? Number(config.params.branchId) : null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthAll = bookings.filter((b: any) => {
    if (branchId && b.branchId !== branchId) return false;
    return new Date(b.startTime) >= monthStart;
  });

  const cancelled = monthAll.filter((b: any) => b.status === 'cancelled');
  const noShows = monthAll.filter((b: any) => b.noShow === true);
  const totalMonth = monthAll.length;
  const cancelRate = totalMonth > 0 ? Math.round((cancelled.length / totalMonth) * 100) : 0;
  const noShowRate = totalMonth > 0 ? Math.round((noShows.length / totalMonth) * 100) : 0;
  const lostRevenue = cancelled.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0)
    + noShows.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);

  // Reason breakdown
  const reasons: Record<string, number> = {};
  cancelled.forEach((b: any) => {
    const reason = b.cancellationReason || 'Не указана';
    reasons[reason] = (reasons[reason] || 0) + 1;
  });
  const reasonBreakdown = Object.entries(reasons).map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // Source breakdown
  const sources = ['widget', 'admin', 'phone', 'walkin'];
  const sourceBreakdown = sources.map(source => {
    const total = monthAll.filter((b: any) => b.source === source).length;
    const canc = cancelled.filter((b: any) => b.source === source).length;
    return { source, total, cancelled: canc, rate: total > 0 ? Math.round((canc / total) * 100) : 0 };
  });

  // Recent cancellations
  const recent = [...cancelled, ...noShows.filter((b: any) => b.status !== 'cancelled')]
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20)
    .map((b: any) => {
      const room = rooms.find(r => r.id === b.roomId);
      return {
        id: b.id,
        date: b.startTime,
        guestName: b.guestName,
        roomName: room?.name || '',
        reason: b.cancellationReason || (b.noShow ? 'No-show' : 'Не указана'),
        source: b.source,
        lostAmount: b.totalPrice,
        isNoShow: b.noShow || false,
      };
    });

  return [200, {
    cancelledCount: cancelled.length,
    noShowCount: noShows.length,
    cancelRate,
    noShowRate,
    lostRevenue,
    reasonBreakdown,
    sourceBreakdown,
    recent,
  }];
});

console.log('[Mock] API mock layer active — login: admin@xarizma.ru / Admin123!');
