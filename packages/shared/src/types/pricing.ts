import { RoomCategory, DayType } from '../constants/enums';

export interface PriceRule {
  id: number;
  category: RoomCategory;
  dayType: DayType;
  timeFrom: string;
  timeTo: string;
  pricePerHour: number;
  validFrom: string | null;
  validTo: string | null;
  isSeasonal: boolean;
  seasonCoefficient: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceRuleDto {
  category: RoomCategory;
  dayType: DayType;
  timeFrom: string;
  timeTo: string;
  pricePerHour: number;
  validFrom?: string;
  validTo?: string;
  isSeasonal?: boolean;
  seasonCoefficient?: number;
}

export interface UpdatePriceRuleDto extends Partial<CreatePriceRuleDto> {}

export interface PriceMatrixEntry {
  category: RoomCategory;
  dayType: DayType;
  pricePerHour: number;
}
