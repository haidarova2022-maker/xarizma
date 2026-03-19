import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import * as schema from './drizzle/schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/xarizma';

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('🌱 Seeding database...');

  // ==================== BRANCHES ====================
  console.log('📍 Creating branches...');
  const branchData = [
    {
      name: 'Харизма Сретенка',
      slug: 'sretenka',
      address: 'ул. Сретенка, д. 1',
      metro: 'Сухаревская',
      phone: '+7 (495) 123-01-01',
      workingHours: {
        monday: { open: '00:00', close: '23:59', is24h: true },
        tuesday: { open: '00:00', close: '23:59', is24h: true },
        wednesday: { open: '00:00', close: '23:59', is24h: true },
        thursday: { open: '00:00', close: '23:59', is24h: true },
        friday: { open: '00:00', close: '23:59', is24h: true },
        saturday: { open: '00:00', close: '23:59', is24h: true },
        sunday: { open: '00:00', close: '23:59', is24h: true },
      },
    },
    {
      name: 'Харизма Бауманская',
      slug: 'baumanskaya',
      address: 'ул. Бауманская, д. 20',
      metro: 'Бауманская',
      phone: '+7 (495) 123-02-02',
      workingHours: {
        monday: { open: '14:00', close: '06:00', is24h: false },
        tuesday: { open: '14:00', close: '06:00', is24h: false },
        wednesday: { open: '14:00', close: '06:00', is24h: false },
        thursday: { open: '14:00', close: '06:00', is24h: false },
        friday: { open: '00:00', close: '23:59', is24h: true },
        saturday: { open: '00:00', close: '23:59', is24h: true },
        sunday: { open: '00:00', close: '23:59', is24h: true },
      },
    },
    {
      name: 'Харизма Новослободская',
      slug: 'novoslobodskaya',
      address: 'ул. Новослободская, д. 14/19',
      metro: 'Новослободская',
      phone: '+7 (495) 123-03-03',
      workingHours: {
        monday: null,
        tuesday: { open: '14:00', close: '06:00', is24h: false },
        wednesday: { open: '14:00', close: '06:00', is24h: false },
        thursday: { open: '14:00', close: '06:00', is24h: false },
        friday: { open: '00:00', close: '23:59', is24h: true },
        saturday: { open: '00:00', close: '23:59', is24h: true },
        sunday: { open: '00:00', close: '23:59', is24h: true },
      },
    },
    {
      name: 'Харизма Лубянка',
      slug: 'lubyanka',
      address: 'ул. Мясницкая, д. 30/1/2',
      metro: 'Лубянка',
      phone: '+7 (495) 123-04-04',
      workingHours: {
        monday: null,
        tuesday: { open: '14:00', close: '06:00', is24h: false },
        wednesday: { open: '14:00', close: '06:00', is24h: false },
        thursday: { open: '14:00', close: '06:00', is24h: false },
        friday: { open: '00:00', close: '23:59', is24h: true },
        saturday: { open: '00:00', close: '23:59', is24h: true },
        sunday: { open: '00:00', close: '23:59', is24h: true },
      },
    },
    {
      name: 'Харизма Рублёвка',
      slug: 'rublevka',
      address: 'Рублёвское шоссе, д. 44 корп. 2',
      metro: 'Молодёжная',
      phone: '+7 (495) 123-05-05',
      workingHours: {
        monday: null,
        tuesday: { open: '14:00', close: '06:00', is24h: false },
        wednesday: { open: '14:00', close: '06:00', is24h: false },
        thursday: { open: '14:00', close: '06:00', is24h: false },
        friday: { open: '00:00', close: '23:59', is24h: true },
        saturday: { open: '00:00', close: '23:59', is24h: true },
        sunday: { open: '00:00', close: '23:59', is24h: true },
      },
    },
  ];

  const insertedBranches = await db.insert(schema.branches)
    .values(branchData)
    .onConflictDoNothing({ target: schema.branches.slug })
    .returning();

  // If branches already existed, fetch them
  const allBranches = insertedBranches.length > 0
    ? insertedBranches
    : await db.select().from(schema.branches).orderBy(schema.branches.id);

  console.log(`  ✅ Branches: ${allBranches.length} (${insertedBranches.length} new)`);

  const branchBySlug = Object.fromEntries(allBranches.map(b => [b.slug, b]));

  // ==================== ROOMS ====================
  console.log('🚪 Creating rooms...');

  const roomsData: any[] = [];

  // Сретенка — 9 залов
  const sretRooms = [
    { name: 'Зал 1', number: 1, category: 'bratski' as const, areaSqm: 15, capacityStandard: 4, capacityMax: 6 },
    { name: 'Зал 2', number: 2, category: 'bratski' as const, areaSqm: 18, capacityStandard: 5, capacityMax: 8 },
    { name: 'Зал 3', number: 3, category: 'vibe' as const, areaSqm: 25, capacityStandard: 6, capacityMax: 10 },
    { name: 'Зал 4', number: 4, category: 'vibe' as const, areaSqm: 28, capacityStandard: 8, capacityMax: 12 },
    { name: 'Зал 5', number: 5, category: 'flex' as const, areaSqm: 35, capacityStandard: 10, capacityMax: 15 },
    { name: 'Зал 6', number: 6, category: 'flex' as const, areaSqm: 40, capacityStandard: 12, capacityMax: 18 },
    { name: 'Зал 7', number: 7, category: 'full_gas' as const, areaSqm: 50, capacityStandard: 15, capacityMax: 25 },
    { name: 'Зал 8', number: 8, category: 'full_gas' as const, areaSqm: 60, capacityStandard: 20, capacityMax: 30 },
    { name: 'VIP Зал', number: 9, category: 'full_gas' as const, areaSqm: 80, capacityStandard: 25, capacityMax: 40 },
  ];
  sretRooms.forEach(r => roomsData.push({ ...r, branchId: branchBySlug.sretenka.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Бауманская — 10 залов
  const baumRooms = [
    { name: 'Зал 1', number: 1, category: 'bratski' as const, areaSqm: 14, capacityStandard: 4, capacityMax: 6 },
    { name: 'Зал 2', number: 2, category: 'bratski' as const, areaSqm: 16, capacityStandard: 4, capacityMax: 7 },
    { name: 'Зал 3', number: 3, category: 'bratski' as const, areaSqm: 18, capacityStandard: 5, capacityMax: 8 },
    { name: 'Зал 4', number: 4, category: 'vibe' as const, areaSqm: 22, capacityStandard: 6, capacityMax: 10 },
    { name: 'Зал 5', number: 5, category: 'vibe' as const, areaSqm: 26, capacityStandard: 8, capacityMax: 12 },
    { name: 'Зал 6', number: 6, category: 'flex' as const, areaSqm: 32, capacityStandard: 10, capacityMax: 15 },
    { name: 'Зал 7', number: 7, category: 'flex' as const, areaSqm: 38, capacityStandard: 12, capacityMax: 18 },
    { name: 'Зал 8', number: 8, category: 'full_gas' as const, areaSqm: 45, capacityStandard: 15, capacityMax: 22 },
    { name: 'Зал 9', number: 9, category: 'full_gas' as const, areaSqm: 55, capacityStandard: 18, capacityMax: 28 },
    { name: 'VIP Зал', number: 10, category: 'full_gas' as const, areaSqm: 70, capacityStandard: 22, capacityMax: 35 },
  ];
  baumRooms.forEach(r => roomsData.push({ ...r, branchId: branchBySlug.baumanskaya.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Новослободская — 8 залов
  const novoRooms = [
    { name: 'Зал 1', number: 1, category: 'bratski' as const, areaSqm: 16, capacityStandard: 4, capacityMax: 6 },
    { name: 'Зал 2', number: 2, category: 'bratski' as const, areaSqm: 18, capacityStandard: 5, capacityMax: 8 },
    { name: 'Зал 3', number: 3, category: 'vibe' as const, areaSqm: 24, capacityStandard: 6, capacityMax: 10 },
    { name: 'Зал 4', number: 4, category: 'vibe' as const, areaSqm: 28, capacityStandard: 8, capacityMax: 12 },
    { name: 'Зал 5', number: 5, category: 'flex' as const, areaSqm: 34, capacityStandard: 10, capacityMax: 15 },
    { name: 'Зал 6', number: 6, category: 'flex' as const, areaSqm: 40, capacityStandard: 12, capacityMax: 18 },
    { name: 'Зал 7', number: 7, category: 'full_gas' as const, areaSqm: 50, capacityStandard: 15, capacityMax: 25 },
    { name: 'VIP Зал', number: 8, category: 'full_gas' as const, areaSqm: 65, capacityStandard: 20, capacityMax: 32 },
  ];
  novoRooms.forEach(r => roomsData.push({ ...r, branchId: branchBySlug.novoslobodskaya.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Лубянка — 6 залов
  const lubRooms = [
    { name: 'Зал 1', number: 1, category: 'bratski' as const, areaSqm: 15, capacityStandard: 4, capacityMax: 6 },
    { name: 'Зал 2', number: 2, category: 'vibe' as const, areaSqm: 25, capacityStandard: 6, capacityMax: 10 },
    { name: 'Зал 3', number: 3, category: 'vibe' as const, areaSqm: 30, capacityStandard: 8, capacityMax: 12 },
    { name: 'Зал 4', number: 4, category: 'flex' as const, areaSqm: 36, capacityStandard: 10, capacityMax: 16 },
    { name: 'Зал 5', number: 5, category: 'full_gas' as const, areaSqm: 48, capacityStandard: 14, capacityMax: 22 },
    { name: 'VIP Зал', number: 6, category: 'full_gas' as const, areaSqm: 60, capacityStandard: 18, capacityMax: 30 },
  ];
  lubRooms.forEach(r => roomsData.push({ ...r, branchId: branchBySlug.lubyanka.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Рублёвка — 11 залов
  const rubRooms = [
    { name: 'Зал 1', number: 1, category: 'bratski' as const, areaSqm: 16, capacityStandard: 4, capacityMax: 6 },
    { name: 'Зал 2', number: 2, category: 'bratski' as const, areaSqm: 18, capacityStandard: 5, capacityMax: 8 },
    { name: 'Зал 3', number: 3, category: 'bratski' as const, areaSqm: 20, capacityStandard: 5, capacityMax: 8 },
    { name: 'Зал 4', number: 4, category: 'vibe' as const, areaSqm: 24, capacityStandard: 6, capacityMax: 10 },
    { name: 'Зал 5', number: 5, category: 'vibe' as const, areaSqm: 28, capacityStandard: 8, capacityMax: 12 },
    { name: 'Зал 6', number: 6, category: 'flex' as const, areaSqm: 35, capacityStandard: 10, capacityMax: 15 },
    { name: 'Зал 7', number: 7, category: 'flex' as const, areaSqm: 40, capacityStandard: 12, capacityMax: 18 },
    { name: 'Зал 8', number: 8, category: 'flex' as const, areaSqm: 42, capacityStandard: 12, capacityMax: 20 },
    { name: 'Зал 9', number: 9, category: 'full_gas' as const, areaSqm: 55, capacityStandard: 16, capacityMax: 25 },
    { name: 'Зал 10', number: 10, category: 'full_gas' as const, areaSqm: 65, capacityStandard: 20, capacityMax: 30 },
    { name: 'VIP Зал', number: 11, category: 'full_gas' as const, areaSqm: 90, capacityStandard: 30, capacityMax: 50 },
  ];
  rubRooms.forEach(r => roomsData.push({ ...r, branchId: branchBySlug.rublevka.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Ensure unique index exists for idempotent inserts
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS rooms_branch_id_number_idx ON rooms (branch_id, number)
  `);

  let roomsInserted = 0;
  for (const room of roomsData) {
    const result = await db.execute(sql`
      INSERT INTO rooms (branch_id, name, number, category, area_sqm, capacity_standard, capacity_max, has_karaoke, has_bar)
      VALUES (${room.branchId}, ${room.name}, ${room.number}, ${room.category}, ${room.areaSqm}, ${room.capacityStandard}, ${room.capacityMax}, ${room.hasKaraoke}, ${room.hasBar})
      ON CONFLICT (branch_id, number) DO NOTHING
    `);
    if ((result as any).rowCount > 0) roomsInserted++;
  }
  console.log(`  ✅ Rooms: ${roomsData.length} total (${roomsInserted} new)`);

  // ==================== PRICE RULES ====================
  console.log('💰 Creating price rules...');

  const categories = ['bratski', 'vibe', 'flex', 'full_gas'] as const;
  const dayTypes = ['weekday_day', 'weekday_evening', 'friday_day', 'friday_evening', 'saturday', 'sunday'] as const;

  const priceMatrix: Record<string, Record<string, number>> = {
    bratski: {
      weekday_day: 1390, weekday_evening: 1390,
      friday_day: 1390, friday_evening: 2690,
      saturday: 2690, sunday: 1690,
    },
    vibe: {
      weekday_day: 3190, weekday_evening: 3190,
      friday_day: 3190, friday_evening: 4990,
      saturday: 4990, sunday: 3990,
    },
    flex: {
      weekday_day: 3590, weekday_evening: 3590,
      friday_day: 3590, friday_evening: 5990,
      saturday: 5990, sunday: 4990,
    },
    full_gas: {
      weekday_day: 4390, weekday_evening: 4390,
      friday_day: 4390, friday_evening: 6990,
      saturday: 6990, sunday: 5490,
    },
  };

  let pricesInserted = 0;
  for (const cat of categories) {
    for (const dt of dayTypes) {
      const result = await db.execute(sql`
        INSERT INTO price_rules (category, day_type, time_from, time_to, price_per_hour, is_seasonal, season_coefficient)
        VALUES (${cat}, ${dt}, '00:00', '23:59', ${priceMatrix[cat][dt]}, false, '1.00')
        ON CONFLICT DO NOTHING
      `);
      if ((result as any).rowCount > 0) pricesInserted++;
    }
  }
  console.log(`  ✅ Price rules: ${categories.length * dayTypes.length} total (${pricesInserted} new)`);

  // ==================== USERS ====================
  console.log('👤 Creating users...');

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const usersData = [
    { email: 'admin@xarizma.ru', name: 'Администратор', role: 'admin' as const, branchId: null },
    { email: 'rop@xarizma.ru', name: 'Иванов Сергей (РОП)', role: 'rop' as const, branchId: null },
    { email: 'manager.sretenka@xarizma.ru', name: 'Петрова Анна', role: 'senior_manager' as const, branchId: branchBySlug.sretenka.id },
    { email: 'manager.baumanskaya@xarizma.ru', name: 'Козлов Дмитрий', role: 'senior_manager' as const, branchId: branchBySlug.baumanskaya.id },
    { email: 'manager.novoslobodskaya@xarizma.ru', name: 'Смирнова Елена', role: 'senior_manager' as const, branchId: branchBySlug.novoslobodskaya.id },
    { email: 'manager.lubyanka@xarizma.ru', name: 'Волков Алексей', role: 'shift_manager' as const, branchId: branchBySlug.lubyanka.id },
    { email: 'manager.rublevka@xarizma.ru', name: 'Новикова Мария', role: 'shift_manager' as const, branchId: branchBySlug.rublevka.id },
  ];

  let usersInserted = 0;
  for (const user of usersData) {
    const result = await db.insert(schema.users)
      .values({ ...user, passwordHash })
      .onConflictDoNothing({ target: schema.users.email })
      .returning();
    if (result.length > 0) usersInserted++;
  }
  console.log(`  ✅ Users: ${usersData.length} total (${usersInserted} new)`);

  console.log('\n✅ Seed completed successfully!');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
