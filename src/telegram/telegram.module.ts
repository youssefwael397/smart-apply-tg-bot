import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TelegramService } from './telegram.service';
import { UserModule } from '../user/user.module';
import { CvModule } from '../cv/cv.module';
import { GeminiModule } from '../gemini/gemini.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    UserModule,
    CvModule,
    GeminiModule,
    JobsModule,
  ],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
