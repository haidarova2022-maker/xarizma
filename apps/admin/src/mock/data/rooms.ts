function r(
  id: number, branchId: number, name: string, number: number,
  category: string, areaSqm: number, capStd: number, capMax: number,
) {
  const karaokeTypes: Record<string, string> = {
    bratski: 'YouTube',
    vibe: 'AST-50',
    flex: 'AST-50 Premium',
    full_gas: 'AST-50 VIP',
  };
  return {
    id, branchId, name, number, category, areaSqm,
    capacityStandard: capStd, capacityMax: capMax,
    hasBar: category !== 'bratski',
    hasKaraoke: true,
    karaokeType: karaokeTypes[category] || 'AST-50',
    equipment: {}, photoUrls: [], isActive: true,
    createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
  };
}

export let rooms = [
  // Сретенка (branch 1) — 9 rooms
  r(1, 1, 'Зал 1', 1, 'bratski', 15, 4, 6),
  r(2, 1, 'Зал 2', 2, 'bratski', 18, 5, 8),
  r(3, 1, 'Зал 3', 3, 'vibe', 25, 6, 10),
  r(4, 1, 'Зал 4', 4, 'vibe', 28, 8, 12),
  r(5, 1, 'Зал 5', 5, 'flex', 35, 10, 15),
  r(6, 1, 'Зал 6', 6, 'flex', 40, 12, 18),
  r(7, 1, 'Зал 7', 7, 'full_gas', 50, 15, 25),
  r(8, 1, 'Зал 8', 8, 'full_gas', 60, 20, 30),
  r(9, 1, 'VIP Зал', 9, 'full_gas', 80, 25, 40),

  // Бауманская (branch 2) — 10 rooms
  r(10, 2, 'Зал 1', 1, 'bratski', 14, 4, 6),
  r(11, 2, 'Зал 2', 2, 'bratski', 16, 4, 7),
  r(12, 2, 'Зал 3', 3, 'bratski', 18, 5, 8),
  r(13, 2, 'Зал 4', 4, 'vibe', 22, 6, 10),
  r(14, 2, 'Зал 5', 5, 'vibe', 26, 8, 12),
  r(15, 2, 'Зал 6', 6, 'flex', 32, 10, 15),
  r(16, 2, 'Зал 7', 7, 'flex', 38, 12, 18),
  r(17, 2, 'Зал 8', 8, 'full_gas', 45, 15, 22),
  r(18, 2, 'Зал 9', 9, 'full_gas', 55, 18, 28),
  r(19, 2, 'VIP Зал', 10, 'full_gas', 70, 22, 35),

  // Новослободская (branch 3) — 8 rooms
  r(20, 3, 'Зал 1', 1, 'bratski', 16, 4, 6),
  r(21, 3, 'Зал 2', 2, 'bratski', 18, 5, 8),
  r(22, 3, 'Зал 3', 3, 'vibe', 24, 6, 10),
  r(23, 3, 'Зал 4', 4, 'vibe', 28, 8, 12),
  r(24, 3, 'Зал 5', 5, 'flex', 34, 10, 15),
  r(25, 3, 'Зал 6', 6, 'flex', 40, 12, 18),
  r(26, 3, 'Зал 7', 7, 'full_gas', 50, 15, 25),
  r(27, 3, 'VIP Зал', 8, 'full_gas', 65, 20, 32),

  // Лубянка (branch 4) — 6 rooms
  r(28, 4, 'Зал 1', 1, 'bratski', 15, 4, 6),
  r(29, 4, 'Зал 2', 2, 'vibe', 25, 6, 10),
  r(30, 4, 'Зал 3', 3, 'vibe', 30, 8, 12),
  r(31, 4, 'Зал 4', 4, 'flex', 36, 10, 16),
  r(32, 4, 'Зал 5', 5, 'full_gas', 48, 14, 22),
  r(33, 4, 'VIP Зал', 6, 'full_gas', 60, 18, 30),

  // Рублёвка (branch 5) — 11 rooms
  r(34, 5, 'Зал 1', 1, 'bratski', 16, 4, 6),
  r(35, 5, 'Зал 2', 2, 'bratski', 18, 5, 8),
  r(36, 5, 'Зал 3', 3, 'bratski', 20, 5, 8),
  r(37, 5, 'Зал 4', 4, 'vibe', 24, 6, 10),
  r(38, 5, 'Зал 5', 5, 'vibe', 28, 8, 12),
  r(39, 5, 'Зал 6', 6, 'flex', 35, 10, 15),
  r(40, 5, 'Зал 7', 7, 'flex', 40, 12, 18),
  r(41, 5, 'Зал 8', 8, 'flex', 42, 12, 20),
  r(42, 5, 'Зал 9', 9, 'full_gas', 55, 16, 25),
  r(43, 5, 'Зал 10', 10, 'full_gas', 65, 20, 30),
  r(44, 5, 'VIP Зал', 11, 'full_gas', 90, 30, 50),
];
