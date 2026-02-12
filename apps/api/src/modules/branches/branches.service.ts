import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { branches } from '../../drizzle/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Injectable()
export class BranchesService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findAll() {
    return this.db.select().from(branches).where(eq(branches.isActive, true));
  }

  async findById(id: number) {
    const [branch] = await this.db.select().from(branches).where(eq(branches.id, id));
    if (!branch) throw new NotFoundException('Филиал не найден');
    return branch;
  }

  async create(data: {
    name: string;
    slug: string;
    address: string;
    metro: string;
    phone: string;
    workingHours: any;
  }) {
    const [branch] = await this.db.insert(branches).values(data).returning();
    return branch;
  }

  async update(id: number, data: Partial<{
    name: string;
    slug: string;
    address: string;
    metro: string;
    phone: string;
    workingHours: any;
    isActive: boolean;
  }>) {
    const [branch] = await this.db.update(branches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    if (!branch) throw new NotFoundException('Филиал не найден');
    return branch;
  }
}
