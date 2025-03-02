import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

interface BybitPriceResponse {
  retCode: number;
  result: {
    list: {
      lastPrice: string;
    }[];
  };
  retMsg: string;
}

@Injectable()
export class BybitPriceService {
  private readonly logger = new Logger(BybitPriceService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl = 'https://api.bybit.com';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
    });
  }

  /**
   * Gets the current price for a symbol/USDT trading pair
   * @param symbol - The trading symbol (e.g., 'BTC', 'ETH')
   * @returns The current price as a string
   * @throws Error if the API request fails or returns invalid data
   */
  public async getPrice(symbol: string): Promise<string> {
    if (symbol === 'USDC') {
      return Promise.resolve('1');
    }
    try {
      const response = await this.client.get<BybitPriceResponse>(
        `/v5/market/tickers`,
        {
          params: {
            category: 'spot',
            symbol: `${symbol}USDT`,
          },
        }
      );
      if (response.data.retCode !== 0) {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
      return response.data.result.list[0].lastPrice;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}: ${error.message}`);
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }
} 