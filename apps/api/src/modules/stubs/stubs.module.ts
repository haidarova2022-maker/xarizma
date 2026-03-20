import { Module } from '@nestjs/common';
import { StubsController } from './stubs.controller';
import { DrizzleModule } from '../../drizzle/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [StubsController],
})
export class StubsModule {}
