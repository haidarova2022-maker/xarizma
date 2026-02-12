import { Controller, Get, Post, Put, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  findAll() {
    return this.pricingService.findAll();
  }

  @Get('calculate')
  async calculate(
    @Query('category') category: 'bratski' | 'vibe' | 'flex' | 'full_gas',
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.pricingService.calculateBookingPrice(
      category,
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'rop')
  create(@Body() dto: any) {
    return this.pricingService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'rop')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.pricingService.update(id, dto);
  }
}
