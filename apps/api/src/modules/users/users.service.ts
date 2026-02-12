import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { users } from '../../drizzle/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../drizzle/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findAll() {
    return this.db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      branchId: users.branchId,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
    }).from(users);
  }

  async findById(id: number) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'rop' | 'senior_manager' | 'shift_manager';
    branchId?: number;
  }) {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Email уже используется');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await this.db.insert(users).values({
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      branchId: data.branchId ?? null,
    }).returning();
    return user;
  }

  async update(id: number, data: {
    email?: string;
    password?: string;
    name?: string;
    role?: 'admin' | 'rop' | 'senior_manager' | 'shift_manager';
    branchId?: number | null;
    isActive?: boolean;
  }) {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }
    const [user] = await this.db.update(users).set(updateData).where(eq(users.id, id)).returning();
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async updateLastLogin(id: number) {
    await this.db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }
}
