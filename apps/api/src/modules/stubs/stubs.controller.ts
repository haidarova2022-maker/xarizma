import { Controller, Get, Query } from '@nestjs/common';

@Controller()
export class StubsController {
  @Get('promo-codes')
  getPromoCodes() {
    return [];
  }

  @Get('promo-codes/active')
  getActivePromos() {
    return [];
  }

  @Get('packages')
  getPackages() {
    return [];
  }

  @Get('waitlist')
  getWaitlist() {
    return { data: [], total: 0 };
  }

  @Get('notifications')
  getNotifications() {
    return [];
  }

  @Get('notifications/stats')
  getNotificationStats() {
    return { total: 0, sent: 0, failed: 0, pending: 0 };
  }

  @Get('empty-slots')
  getEmptySlots() {
    return [];
  }

  @Get('slot-config')
  getSlotConfig() {
    return { slotDuration: 2, gapHours: 0.25, startHour: 10 };
  }
}
