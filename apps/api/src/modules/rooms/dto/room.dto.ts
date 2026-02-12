import { IsString, IsInt, IsEnum, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';

export class CreateRoomDto {
  @IsInt()
  branchId: number;

  @IsString()
  name: string;

  @IsInt()
  number: number;

  @IsEnum(['bratski', 'vibe', 'flex', 'full_gas'])
  category: 'bratski' | 'vibe' | 'flex' | 'full_gas';

  @IsInt()
  areaSqm: number;

  @IsInt()
  capacityStandard: number;

  @IsInt()
  capacityMax: number;

  @IsOptional() @IsObject()
  equipment?: any;

  @IsOptional() @IsBoolean()
  hasBar?: boolean;

  @IsOptional() @IsBoolean()
  hasKaraoke?: boolean;

  @IsOptional() @IsString()
  karaokeType?: string;

  @IsOptional() @IsArray()
  photoUrls?: string[];
}

export class UpdateRoomDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsInt()
  number?: number;

  @IsOptional() @IsEnum(['bratski', 'vibe', 'flex', 'full_gas'])
  category?: 'bratski' | 'vibe' | 'flex' | 'full_gas';

  @IsOptional() @IsInt()
  areaSqm?: number;

  @IsOptional() @IsInt()
  capacityStandard?: number;

  @IsOptional() @IsInt()
  capacityMax?: number;

  @IsOptional() @IsObject()
  equipment?: any;

  @IsOptional() @IsBoolean()
  hasBar?: boolean;

  @IsOptional() @IsBoolean()
  hasKaraoke?: boolean;

  @IsOptional() @IsString()
  karaokeType?: string;

  @IsOptional() @IsArray()
  photoUrls?: string[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
