import { UserRole } from '../constants/enums';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  branchId: number | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  branchId?: number;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
  branchId?: number | null;
  isActive?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: Omit<User, 'createdAt' | 'updatedAt'>;
}
