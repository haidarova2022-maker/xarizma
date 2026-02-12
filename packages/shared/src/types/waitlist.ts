import { RoomCategory, WaitlistStatus } from '../constants/enums';

export interface WaitlistEntry {
  id: number;
  branchId: number;
  roomCategory: RoomCategory;
  desiredDate: string;
  desiredTimeFrom: string;
  desiredTimeTo: string;
  guestCount: number;
  guestName: string;
  guestPhone: string;
  status: WaitlistStatus;
  notifiedAt: string | null;
  createdAt: string;
}

export interface CreateWaitlistDto {
  branchId: number;
  roomCategory: RoomCategory;
  desiredDate: string;
  desiredTimeFrom: string;
  desiredTimeTo: string;
  guestCount: number;
  guestName: string;
  guestPhone: string;
}
