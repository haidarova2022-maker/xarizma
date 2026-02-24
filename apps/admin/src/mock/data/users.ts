export let users = [
  { id: 1, email: 'admin@xarizma.ru', name: 'Администратор', role: 'admin', branchId: null, isActive: true, lastLogin: new Date().toISOString(), createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 2, email: 'rop@xarizma.ru', name: 'Иванов Сергей', role: 'rop', branchId: null, isActive: true, lastLogin: null, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 3, email: 'senior@xarizma.ru', name: 'Петрова Анна', role: 'senior_manager', branchId: 1, isActive: true, lastLogin: new Date(Date.now() - 3600000).toISOString(), createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 4, email: 'manager1@xarizma.ru', name: 'Козлов Дмитрий', role: 'shift_manager', branchId: 1, isActive: true, lastLogin: new Date(Date.now() - 7200000).toISOString(), createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 5, email: 'manager2@xarizma.ru', name: 'Соколова Мария', role: 'shift_manager', branchId: 2, isActive: true, lastLogin: new Date(Date.now() - 14400000).toISOString(), createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 6, email: 'manager3@xarizma.ru', name: 'Орлов Максим', role: 'shift_manager', branchId: 3, isActive: true, lastLogin: new Date(Date.now() - 86400000).toISOString(), createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
  { id: 7, email: 'manager4@xarizma.ru', name: 'Белова Екатерина', role: 'shift_manager', branchId: 4, isActive: true, lastLogin: null, createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z' },
  { id: 8, email: 'manager5@xarizma.ru', name: 'Тарасов Алексей', role: 'shift_manager', branchId: 5, isActive: true, lastLogin: new Date(Date.now() - 172800000).toISOString(), createdAt: '2025-03-01T00:00:00Z', updatedAt: '2025-03-01T00:00:00Z' },
];
