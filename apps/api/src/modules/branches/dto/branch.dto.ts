import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  address: string;

  @IsString()
  metro: string;

  @IsString()
  phone: string;

  @IsObject()
  workingHours: any;
}

export class UpdateBranchDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  slug?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  metro?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsObject()
  workingHours?: any;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
