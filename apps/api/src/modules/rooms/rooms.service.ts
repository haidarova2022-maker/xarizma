import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { rooms } from '../../drizzle/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Injectable()
export class RoomsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findAll(branchId?: number) {
    if (branchId) {
      return this.db.select().from(rooms)
        .where(and(eq(rooms.branchId, branchId), eq(rooms.isActive, true)));
    }
    return this.db.select().from(rooms).where(eq(rooms.isActive, true));
  }

  async findById(id: number) {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.id, id));
    if (!room) throw new NotFoundException('Зал не найден');
    return room;
  }

  async create(data: {
    branchId: number;
    name: string;
    number: number;
    category: 'bratski' | 'vibe' | 'flex' | 'full_gas';
    areaSqm: number;
    capacityStandard: number;
    capacityMax: number;
    equipment?: any;
    hasBar?: boolean;
    hasKaraoke?: boolean;
    karaokeType?: string;
    photoUrls?: string[];
  }) {
    const [room] = await this.db.insert(rooms).values(data).returning();
    return room;
  }

  async update(id: number, data: any) {
    const [room] = await this.db.update(rooms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    if (!room) throw new NotFoundException('Зал не найден');
    return room;
  }
}
