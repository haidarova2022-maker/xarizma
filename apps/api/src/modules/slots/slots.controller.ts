import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SlotsService } from './slots.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Slots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get()
  @Roles('admin', 'rop')
  findAll(@Query('branchId') branchId?: number) {
    return this.slotsService.findAll(branchId);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: any) {
    return this.slotsService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.slotsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.slotsService.delete(id);
  }
}
