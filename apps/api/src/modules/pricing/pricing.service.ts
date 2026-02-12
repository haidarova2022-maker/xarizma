import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, or, isNull, lte, gte } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { priceRules } from '../../drizzle/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Injectable()
export class PricingService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findAll() {
    return this.db.select().from(priceRules);
  }

  async findById(id: number) {
    const [rule] = await this.db.select().from(priceRules).where(eq(priceRules.id, id));
    if (!rule) throw new NotFoundException('Ценовое правило не найдено');
    return rule;
  }

  async getPrice(
    category: 'bratski' | 'vibe' | 'flex' | 'full_gas',
    dayType: string,
    date?: Date,
  ): Promise<number> {
    const rules = await this.db.select().from(priceRules)
      .where(and(
        eq(priceRules.category, category),
        eq(priceRules.dayType, dayType as any),
      ));

    if (!rules.length) return 0;

    // Check for seasonal pricing first
    if (date) {
      const seasonal = rules.find(r =>
        r.isSeasonal && r.validFrom && r.validTo &&
        date >= r.validFrom && date <= r.validTo
      );
      if (seasonal) {
        const coeff = parseFloat(seasonal.seasonCoefficient?.toString() || '1');
        return Math.round(seasonal.pricePerHour * coeff);
      }
    }

    // Return base price
    const base = rules.find(r => !r.isSeasonal);
    return base?.pricePerHour || rules[0].pricePerHour;
  }

  async calculateBookingPrice(
    category: 'bratski' | 'vibe' | 'flex' | 'full_gas',
    startTime: Date,
    endTime: Date,
  ) {
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const dayType = this.getDayType(startTime);
    const pricePerHour = await this.getPrice(category, dayType, startTime);

    return {
      pricePerHour,
      hours,
      basePrice: Math.round(pricePerHour * hours),
      breakdown: [{
        timeFrom: startTime.toISOString(),
        timeTo: endTime.toISOString(),
        hours,
        pricePerHour,
        subtotal: Math.round(pricePerHour * hours),
      }],
    };
  }

  private getDayType(date: Date): string {
    const day = date.getDay();
    const hour = date.getHours();
    if (day === 0) return 'sunday';
    if (day === 6) return 'saturday';
    if (day === 5) return hour < 17 ? 'friday_day' : 'friday_evening';
    return hour < 17 ? 'weekday_day' : 'weekday_evening';
  }

  async create(data: {
    category: 'bratski' | 'vibe' | 'flex' | 'full_gas';
    dayType: string;
    timeFrom: string;
    timeTo: string;
    pricePerHour: number;
    validFrom?: Date;
    validTo?: Date;
    isSeasonal?: boolean;
    seasonCoefficient?: string;
  }) {
    const [rule] = await this.db.insert(priceRules).values(data as any).returning();
    return rule;
  }

  async update(id: number, data: any) {
    const [rule] = await this.db.update(priceRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(priceRules.id, id))
      .returning();
    if (!rule) throw new NotFoundException('Ценовое правило не найдено');
    return rule;
  }
}
