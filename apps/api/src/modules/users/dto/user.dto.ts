import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsInt, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsEnum(['admin', 'rop', 'senior_manager', 'shift_manager'])
  role: 'admin' | 'rop' | 'senior_manager' | 'shift_manager';

  @IsOptional()
  @IsInt()
  branchId?: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['admin', 'rop', 'senior_manager', 'shift_manager'])
  role?: 'admin' | 'rop' | 'senior_manager' | 'shift_manager';

  @IsOptional()
  @IsInt()
  branchId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
