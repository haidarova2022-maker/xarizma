import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { slotConfigs } from '../../drizzle/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Injectable()
export class SlotsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findAll(branchId?: number) {
    if (branchId) {
      return this.db.select().from(slotConfigs).where(eq(slotConfigs.branchId, branchId));
    }
    return this.db.select().from(slotConfigs);
  }

  async create(data: {
    branchId: number;
    category: 'bratski' | 'vibe' | 'flex' | 'full_gas';
    dayType: string;
    timeFrom: string;
    timeTo: string;
    minHours?: number;
  }) {
    const [slot] = await this.db.insert(slotConfigs).values(data as any).returning();
    return slot;
  }

  async update(id: number, data: any) {
    const [slot] = await this.db.update(slotConfigs)
      .set(data)
      .where(eq(slotConfigs.id, id))
      .returning();
    if (!slot) throw new NotFoundException('Конфигурация слота не найдена');
    return slot;
  }

  async delete(id: number) {
    await this.db.delete(slotConfigs).where(eq(slotConfigs.id, id));
    return { success: true };
  }
}
