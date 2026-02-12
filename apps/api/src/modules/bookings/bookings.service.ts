import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, gte, lte, lt, gt, ne, sql, between } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { bookings, rooms } from '../../drizzle/schema';
import { PricingService } from '../pricing/pricing.service';
import { RoomsService } from '../rooms/rooms.service';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

const BUFFER_MINUTES = 15;

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private readonly pricingService: PricingService,
    private readonly roomsService: RoomsService,
  ) {}

  async findAll(filters?: {
    branchId?: number;
    roomId?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) {
    let query = this.db.select().from(bookings);
    const conditions: any[] = [];

    if (filters?.branchId) conditions.push(eq(bookings.branchId, filters.branchId));
    if (filters?.roomId) conditions.push(eq(bookings.roomId, filters.roomId));
    if (filters?.status) conditions.push(eq(bookings.status, filters.status as any));
    if (filters?.dateFrom) conditions.push(gte(bookings.startTime, new Date(filters.dateFrom)));
    if (filters?.dateTo) conditions.push(lte(bookings.startTime, new Date(filters.dateTo)));

    if (conditions.length > 0) {
      return this.db.select().from(bookings).where(and(...conditions));
    }
    return this.db.select().from(bookings);
  }

  async findById(id: number) {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) throw new NotFoundException('Бронирование не найдено');
    return booking;
  }

  async getCalendar(branchId: number, dateFrom: string, dateTo: string) {
    const result = await this.db.select({
      id: bookings.id,
      roomId: bookings.roomId,
      roomName: rooms.name,
      roomNumber: rooms.number,
      branchId: bookings.branchId,
      status: bookings.status,
      bookingType: bookings.bookingType,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      guestName: bookings.guestName,
      guestCount: bookings.guestCount,
      totalPrice: bookings.totalPrice,
    })
    .from(bookings)
    .innerJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(and(
      eq(bookings.branchId, branchId),
      gte(bookings.startTime, new Date(dateFrom)),
      lte(bookings.endTime, new Date(dateTo)),
      ne(bookings.status, 'cancelled'),
    ));

    return result;
  }

  async create(data: {
    branchId: number;
    roomId: number;
    bookingType: 'advance' | 'walkin';
    startTime: string;
    endTime: string;
    guestCount: number;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    guestComment?: string;
    source: 'widget' | 'admin' | 'phone' | 'walkin';
    createdByUserId?: number;
  }) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    // Validate min 2 hours
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (hours < 2) throw new BadRequestException('Минимальное время бронирования — 2 часа');

    // Check for conflicts (with 15-min buffer)
    const bufferMs = BUFFER_MINUTES * 60 * 1000;
    const bufferedStart = new Date(start.getTime() - bufferMs);
    const bufferedEnd = new Date(end.getTime() + bufferMs);

    const conflicts = await this.db.select().from(bookings).where(and(
      eq(bookings.roomId, data.roomId),
      ne(bookings.status, 'cancelled'),
      lt(bookings.startTime, bufferedEnd),
      gt(bookings.endTime, bufferedStart),
    ));

    if (conflicts.length > 0) {
      throw new ConflictException('Выбранное время пересекается с существующим бронированием');
    }

    // Calculate price
    const room = await this.roomsService.findById(data.roomId);
    const pricing = await this.pricingService.calculateBookingPrice(
      room.category,
      start,
      end,
    );

    const status = data.bookingType === 'walkin' ? 'walkin' : 'new';

    const [booking] = await this.db.insert(bookings).values({
      ...data,
      startTime: start,
      endTime: end,
      status: status as any,
      basePrice: pricing.basePrice,
      discountAmount: 0,
      totalPrice: pricing.basePrice,
      prepaymentAmount: 0,
    }).returning();

    return booking;
  }

  async update(id: number, data: {
    status?: string;
    startTime?: string;
    endTime?: string;
    guestCount?: number;
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    guestComment?: string;
  }) {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);

    // If times changed, check conflicts
    if (data.startTime || data.endTime) {
      const existing = await this.findById(id);
      const start = data.startTime ? new Date(data.startTime) : existing.startTime;
      const end = data.endTime ? new Date(data.endTime) : existing.endTime;

      const bufferMs = BUFFER_MINUTES * 60 * 1000;
      const conflicts = await this.db.select().from(bookings).where(and(
        eq(bookings.roomId, existing.roomId),
        ne(bookings.id, id),
        ne(bookings.status, 'cancelled'),
        lt(bookings.startTime, new Date(end.getTime() + bufferMs)),
        gt(bookings.endTime, new Date(start.getTime() - bufferMs)),
      ));

      if (conflicts.length > 0) {
        throw new ConflictException('Новое время пересекается с существующим бронированием');
      }
    }

    const [booking] = await this.db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    if (!booking) throw new NotFoundException('Бронирование не найдено');
    return booking;
  }

  async getAvailableSlots(
    branchId: number,
    date: string,
    guestCount?: number,
    category?: string,
  ) {
    // Get all rooms for the branch
    let roomsList = await this.roomsService.findAll(branchId);
    if (category) {
      roomsList = roomsList.filter(r => r.category === category);
    }
    if (guestCount) {
      roomsList = roomsList.filter(r => r.capacityMax >= guestCount);
    }

    // Get all bookings for the day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayBookings = await this.db.select().from(bookings).where(and(
      eq(bookings.branchId, branchId),
      ne(bookings.status, 'cancelled'),
      gte(bookings.startTime, dayStart),
      lte(bookings.startTime, dayEnd),
    ));

    // Generate available 1-hour slots from 10:00 to 05:00
    const slots: any[] = [];
    for (const room of roomsList) {
      for (let hour = 10; hour <= 28; hour++) { // 28 = 04:00 next day
        const actualHour = hour % 24;
        const slotStart = new Date(date);
        slotStart.setHours(actualHour, 0, 0, 0);
        if (hour >= 24) slotStart.setDate(slotStart.getDate() + 1);

        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

        // Check if slot conflicts with any booking
        const hasConflict = dayBookings.some(b =>
          b.roomId === room.id &&
          b.startTime < slotEnd &&
          b.endTime > slotStart
        );

        if (!hasConflict) {
          const dayType = this.getDayType(slotStart);
          const pricePerHour = await this.pricingService.getPrice(
            room.category,
            dayType,
            slotStart,
          );

          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            roomId: room.id,
            roomName: room.name,
            roomCategory: room.category,
            capacity: room.capacityMax,
            pricePerHour,
          });
        }
      }
    }

    return slots;
  }

  private getDayType(date: Date): string {
    const day = date.getDay();
    const hour = date.getHours();
    if (day === 0) return 'sunday';
    if (day === 6) return 'saturday';
    if (day === 5) return hour < 17 ? 'friday_day' : 'friday_evening';
    return hour < 17 ? 'weekday_day' : 'weekday_evening';
  }
}
