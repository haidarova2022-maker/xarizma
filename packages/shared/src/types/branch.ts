export interface Branch {
  id: number;
  name: string;
  slug: string;
  address: string;
  metro: string;
  phone: string;
  workingHours: WorkingHours;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkingHours {
  monday: DaySchedule | null;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  open: string;  // "14:00"
  close: string; // "06:00" (next day)
  is24h: boolean;
}

export interface CreateBranchDto {
  name: string;
  slug: string;
  address: string;
  metro: string;
  phone: string;
  workingHours: WorkingHours;
}

export interface UpdateBranchDto extends Partial<CreateBranchDto> {
  isActive?: boolean;
}
