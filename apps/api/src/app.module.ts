import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './drizzle/drizzle.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { SlotsModule } from './modules/slots/slots.module';
import { UsersModule } from './modules/users/users.module';
import { GatewayModule } from './gateway/gateway.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { StubsModule } from './modules/stubs/stubs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
    AuthModule,
    BranchesModule,
    RoomsModule,
    PricingModule,
    BookingsModule,
    SlotsModule,
    UsersModule,
    GatewayModule,
    DashboardModule,
    AnalyticsModule,
    StubsModule,
  ],
})
export class AppModule {}
