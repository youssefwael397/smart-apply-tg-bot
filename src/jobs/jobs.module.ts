import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
  ],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
