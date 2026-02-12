import { RoomCategory } from '../constants/enums';

export interface Room {
  id: number;
  branchId: number;
  name: string;
  number: number;
  category: RoomCategory;
  areaSqm: number;
  capacityStandard: number;
  capacityMax: number;
  equipment: RoomEquipment;
  hasBar: boolean;
  hasKaraoke: boolean;
  karaokeType: string | null;
  photoUrls: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomEquipment {
  microphones?: number;
  screens?: number;
  speakers?: string;
  additionalFeatures?: string[];
}

export interface CreateRoomDto {
  branchId: number;
  name: string;
  number: number;
  category: RoomCategory;
  areaSqm: number;
  capacityStandard: number;
  capacityMax: number;
  equipment?: RoomEquipment;
  hasBar?: boolean;
  hasKaraoke?: boolean;
  karaokeType?: string;
  photoUrls?: string[];
}

export interface UpdateRoomDto extends Partial<CreateRoomDto> {
  isActive?: boolean;
}
