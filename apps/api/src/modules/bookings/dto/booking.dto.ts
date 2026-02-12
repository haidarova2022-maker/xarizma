import { IsString, IsInt, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  branchId: number;

  @IsInt()
  roomId: number;

  @IsEnum(['advance', 'walkin'])
  bookingType: 'advance' | 'walkin';

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsInt()
  guestCount: number;

  @IsString()
  guestName: string;

  @IsString()
  guestPhone: string;

  @IsOptional() @IsString()
  guestEmail?: string;

  @IsOptional() @IsString()
  guestComment?: string;

  @IsEnum(['widget', 'admin', 'phone', 'walkin'])
  source: 'widget' | 'admin' | 'phone' | 'walkin';
}

export class UpdateBookingDto {
  @IsOptional()
  @IsEnum(['new', 'awaiting_payment', 'partially_paid', 'fully_paid', 'walkin', 'completed', 'cancelled'])
  status?: string;

  @IsOptional() @IsDateString()
  startTime?: string;

  @IsOptional() @IsDateString()
  endTime?: string;

  @IsOptional() @IsInt()
  guestCount?: number;

  @IsOptional() @IsString()
  guestName?: string;

  @IsOptional() @IsString()
  guestPhone?: string;

  @IsOptional() @IsString()
  guestEmail?: string;

  @IsOptional() @IsString()
  guestComment?: string;
}
