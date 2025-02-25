import { Injectable } from "@nestjs/common";
import { Bot } from 'grammy';

@Injectable()
export class LoggerService {
  private telegram: Bot;
  private channelId: number;
  private topicId: number;
  private errorTopicId: number;
  constructor() {
    this.telegram = new Bot(process.env.TELEGRAM_BOT_TOKEN);
    this.channelId = parseInt(process.env.TELEGRAM_CHANNEL_ID);
    this.topicId = parseInt(process.env.TELEGRAM_TOPIC_ID);
    this.errorTopicId = parseInt(process.env.TELEGRAM_ERROR_TOPIC_ID);
  }

  async log(
    message: string,
    level: "info" | "error" | "warn" | "debug" = "info"
  ): Promise<void> {
    const timestamp = new Date().toUTCString();
    switch (level) {
      case "error":
        console.error(`[ERROR] ${timestamp} ${message}'`);
        break;
      case "warn":
        console.warn(`[WARN] ${timestamp} ${message}`);
        break;
      case "debug":
        console.log(`[DEBUG] ${timestamp} ${message}`);
        break;
      default:
        console.info(`[INFO] ${timestamp} ${message}`);
    }
  }

  async telegramNotify(
    message: string,
    parse_mode?: 'MarkdownV2' | 'Markdown' | 'HTML',
    type: 'info' | 'error' = 'info'
  ): Promise<void> {
    try {
      const topicId = type === 'error' ? this.errorTopicId : this.topicId;
      const options = topicId ? { message_thread_id: topicId } : {};
      await this.telegram.api.sendMessage(this.channelId, message, {...options, parse_mode });
    } catch (error) {
      await this.log(
        `Failed to send telegram notification: ${error.message}`,
        "error"
      );
    }
  }
}
