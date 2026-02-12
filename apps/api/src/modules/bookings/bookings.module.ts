import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PricingModule } from '../pricing/pricing.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [PricingModule, RoomsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
