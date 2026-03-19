import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sources')
  async getSources(@Query('branchId') branchId?: string) {
    return this.analyticsService.getSourceAnalytics(branchId ? parseInt(branchId) : undefined);
  }

  @Get('rooms')
  async getRooms(@Query('branchId') branchId?: string) {
    return this.analyticsService.getRoomAnalytics(branchId ? parseInt(branchId) : undefined);
  }

  @Get('cancellations')
  async getCancellations(@Query('branchId') branchId?: string) {
    return this.analyticsService.getCancellationAnalytics(branchId ? parseInt(branchId) : undefined);
  }

  @Get('managers')
  async getManagers(@Query('branchId') branchId?: string) {
    return this.analyticsService.getManagerAnalytics(branchId ? parseInt(branchId) : undefined);
  }
}
