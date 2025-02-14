import { Injectable } from "@nestjs/common";
import { Bot } from 'grammy';

@Injectable()
export class LoggerService {
  private telegram: Bot;
  private channelId: number;
  private topicId: number;

  constructor() {
    this.telegram = new Bot(process.env.TELEGRAM_BOT_TOKEN);
    this.channelId = parseInt(process.env.TELEGRAM_CHANNEL_ID);
    this.topicId = parseInt(process.env.TELEGRAM_TOPIC_ID);
  }

  async log(
    message: string,
    level: "info" | "error" | "warn" | "debug" = "info"
  ): Promise<void> {
    switch (level) {
      case "error":
        console.error(`[ERROR] ${message}`);
        break;
      case "warn":
        console.warn(`[WARN] ${message}`);
        break;
      case "debug":
        console.log(`[DEBUG] ${message}`);
        break;
      default:
        console.info(`[INFO] ${message}`);
    }
  }

  async telegramNotify(
    message: string,
    parse_mode?: 'MarkdownV2' | 'Markdown' | 'HTML'
  ): Promise<void> {
    try {
      const options = this.topicId ? { message_thread_id: this.topicId } : {};
      await this.telegram.api.sendMessage(this.channelId, message, {...options, parse_mode });
    } catch (error) {
      await this.log(
        `Failed to send telegram notification: ${error.message}`,
        "error"
      );
    }
  }
}
