import { Controller, Get, Post, Put, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateBookingDto, UpdateBookingDto } from './dto/booking.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('branchId') branchId?: number,
    @Query('roomId') roomId?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findAll({ branchId, roomId, dateFrom, dateTo, status });
  }

  @Get('calendar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getCalendar(
    @Query('branchId', ParseIntPipe) branchId: number,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.bookingsService.getCalendar(branchId, dateFrom, dateTo);
  }

  @Get('available-slots')
  getAvailableSlots(
    @Query('branchId', ParseIntPipe) branchId: number,
    @Query('date') date: string,
    @Query('guestCount') guestCount?: number,
    @Query('category') category?: string,
  ) {
    return this.bookingsService.getAvailableSlots(branchId, date, guestCount, category);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.bookingsService.create({
      ...dto,
      createdByUserId: req.user?.id,
    });
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookingDto) {
    return this.bookingsService.update(id, dto);
  }
}
