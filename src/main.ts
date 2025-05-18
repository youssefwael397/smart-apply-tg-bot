import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TelegramService } from './telegram/telegram.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);

    // Initialize the Telegram bot
    const telegramService = app.get(TelegramService);
    await telegramService.init();

    logger.log('🤖 Smart Apply Bot is running!');

    // Handle shutdown gracefully
    const handleShutdown = async () => {
      logger.log('Shutting down gracefully...');
      try {
        await app.close();
        logger.log('Application successfully closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    // Wrap the async handler to avoid unhandled promise rejections
    const shutdown = () => {
      void handleShutdown().catch((error) => {
        logger.error('Error in shutdown handler:', error);
        process.exit(1);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', String(reason));
      // Don't exit on unhandled rejections to keep the process running
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

// Start the application
void bootstrap();
