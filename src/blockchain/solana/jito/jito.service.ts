import { Injectable, OnModuleInit } from "@nestjs/common";
import { LoggerService } from "../../../logger/logger.service";
import axios from "axios";

interface TipFloorData {
  time: string;
  landed_tips_25th_percentile: number;
  landed_tips_50th_percentile: number;
  landed_tips_75th_percentile: number;
  landed_tips_95th_percentile: number;
  landed_tips_99th_percentile: number;
  ema_landed_tips_50th_percentile: number;
}

@Injectable()
export class JitoService implements OnModuleInit {
  private readonly FETCH_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds
  private readonly TIP_FLOOR_URL =
    "https://bundles.jito.wtf/api/v1/bundles/tip_floor";
  private tipFloorData: TipFloorData | null = null;
  private base_percentile = "landed_tips_75th_percentile";

  private BASE_TINY_ADDITION_SOL_PERCENT = 1.12;

  private readonly axiosInstance;

  constructor(private readonly logger: LoggerService) {
    this.axiosInstance = axios.create({
      timeout: 5000, // 5 seconds timeout
      headers: {
        Accept: "application/json",
      },
    });
  }

  async onModuleInit() {
    await this.startTipFloorPolling();
  }

  private async startTipFloorPolling() {
    // Initial fetch
    await this.fetchTipFloorData();

    // Set up interval
    setInterval(async () => {
      await this.fetchTipFloorData();
    }, this.FETCH_INTERVAL);
  }

  private async fetchTipFloorData() {
    try {
      const { data } = await this.axiosInstance.get(this.TIP_FLOOR_URL);
      if (Array.isArray(data)) {
        this.tipFloorData = data[0] as TipFloorData;
        this.logger.log(
          `Updated Jito tip floor data. ${this.base_percentile} ${this.tipFloorData[this.base_percentile]}`,
          "info"
        );
        return this.tipFloorData;
      } else {
        throw new Error("Invalid return data format");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.log(
          `Failed to fetch Jito tip floor data: ${error.message}. Status: ${error.response?.status}. Response: ${JSON.stringify(error.response?.data)}`,
          "error"
        );
      } else {
        this.logger.log(
          `Failed to fetch Jito tip floor data: ${error.message}`,
          "error"
        );
      }
    }
  }

  public async fetchLatestTipFloorData(): Promise<number> {
    const tipFloorData = await this.fetchTipFloorData();
    return (
      tipFloorData[this.base_percentile] * this.BASE_TINY_ADDITION_SOL_PERCENT
    );
  }

  public getLatestTipFloorData(): number | null {
    return this.tipFloorData[this.base_percentile] || null;
  }

  public getAllTipFloorData(): TipFloorData | null {
    return this.tipFloorData;
  }
}
