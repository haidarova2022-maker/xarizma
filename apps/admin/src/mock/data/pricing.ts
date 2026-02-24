const cats = ['bratski', 'vibe', 'flex', 'full_gas'] as const;
const dayTypes = ['weekday_day', 'weekday_evening', 'friday_day', 'friday_evening', 'saturday', 'sunday'] as const;

const matrix: Record<string, number[]> = {
  bratski:  [1390, 1390, 1390, 2690, 2690, 1690],
  vibe:     [3190, 3190, 3190, 4990, 4990, 3990],
  flex:     [3590, 3590, 3590, 5990, 5990, 4990],
  full_gas: [4390, 4390, 4390, 6990, 6990, 5490],
};

export let priceRules: any[] = [];
let id = 1;
for (const cat of cats) {
  for (let i = 0; i < dayTypes.length; i++) {
    priceRules.push({
      id: id++, category: cat, dayType: dayTypes[i],
      timeFrom: '00:00', timeTo: '23:59',
      pricePerHour: matrix[cat][i],
      isSeasonal: false, seasonCoefficient: '1.00',
      validFrom: null, validTo: null,
      createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
    });
  }
}
