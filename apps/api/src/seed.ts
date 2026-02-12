import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
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

  const insertedBranches = await db.insert(schema.branches).values(branchData).returning();
  console.log(`  ✅ Created ${insertedBranches.length} branches`);

  // ==================== ROOMS ====================
  console.log('🚪 Creating rooms...');

  const roomsData: any[] = [];

  // Сретенка — 9 залов
  const sretenka = insertedBranches[0];
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
  sretRooms.forEach(r => roomsData.push({ ...r, branchId: sretenka.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Бауманская — 10 залов
  const baum = insertedBranches[1];
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
  baumRooms.forEach(r => roomsData.push({ ...r, branchId: baum.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Новослободская — 8 залов
  const novo = insertedBranches[2];
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
  novoRooms.forEach(r => roomsData.push({ ...r, branchId: novo.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Лубянка — 6 залов
  const lub = insertedBranches[3];
  const lubRooms = [
    { name: 'Зал 1', number: 1, category: 'bratski' as const, areaSqm: 15, capacityStandard: 4, capacityMax: 6 },
    { name: 'Зал 2', number: 2, category: 'vibe' as const, areaSqm: 25, capacityStandard: 6, capacityMax: 10 },
    { name: 'Зал 3', number: 3, category: 'vibe' as const, areaSqm: 30, capacityStandard: 8, capacityMax: 12 },
    { name: 'Зал 4', number: 4, category: 'flex' as const, areaSqm: 36, capacityStandard: 10, capacityMax: 16 },
    { name: 'Зал 5', number: 5, category: 'full_gas' as const, areaSqm: 48, capacityStandard: 14, capacityMax: 22 },
    { name: 'VIP Зал', number: 6, category: 'full_gas' as const, areaSqm: 60, capacityStandard: 18, capacityMax: 30 },
  ];
  lubRooms.forEach(r => roomsData.push({ ...r, branchId: lub.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  // Рублёвка — 11 залов
  const rub = insertedBranches[4];
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
  rubRooms.forEach(r => roomsData.push({ ...r, branchId: rub.id, hasKaraoke: true, hasBar: r.category !== 'bratski' }));

  const insertedRooms = await db.insert(schema.rooms).values(roomsData).returning();
  console.log(`  ✅ Created ${insertedRooms.length} rooms`);

  // ==================== PRICE RULES ====================
  console.log('💰 Creating price rules...');

  const categories = ['bratski', 'vibe', 'flex', 'full_gas'] as const;
  const dayTypes = ['weekday_day', 'weekday_evening', 'friday_day', 'friday_evening', 'saturday', 'sunday'] as const;

  // Price matrix from the plan (per hour)
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

  const priceRulesData: any[] = [];
  for (const cat of categories) {
    for (const dt of dayTypes) {
      priceRulesData.push({
        category: cat,
        dayType: dt,
        timeFrom: '00:00',
        timeTo: '23:59',
        pricePerHour: priceMatrix[cat][dt],
        isSeasonal: false,
        seasonCoefficient: '1.00',
      });
    }
  }

  const insertedPrices = await db.insert(schema.priceRules).values(priceRulesData).returning();
  console.log(`  ✅ Created ${insertedPrices.length} price rules`);

  // ==================== ADMIN USER ====================
  console.log('👤 Creating admin user...');

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  await db.insert(schema.users).values({
    email: 'admin@xarizma.ru',
    passwordHash,
    name: 'Администратор',
    role: 'admin',
  });
  console.log('  ✅ Created admin user (admin@xarizma.ru / Admin123!)');

  console.log('\n✅ Seed completed successfully!');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
