import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class LoggerService {
  private telegram: Telegraf;

  constructor() {
    this.telegram = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  }

  async log(message: string, level: 'info' | 'error' | 'warn' = 'info'): Promise<void> {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  async telegramNotify(message: string, chatId: string, topicId?: number): Promise<void> {
    try {
      const options = topicId ? { message_thread_id: topicId } : {};
      await this.telegram.telegram.sendMessage(chatId, message, options);
    } catch (error) {
      await this.log(`Failed to send telegram notification: ${error.message}`, 'error');
    }
  }
} 