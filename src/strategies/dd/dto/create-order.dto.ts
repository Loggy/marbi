import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { EVMSwapParams } from "src/blockchain/evm/providers/okx";
import { SolanaSwapParams } from "src/blockchain/solana/solana.service";

export class AmountIn {
  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  AlertLevelUSD?: number;
}

export class NetworkConfig {
  @IsString()
  NetworkName: string;

  @IsString()
  StartTokenAddress: string;

  @IsString()
  @IsOptional()
  StartTokenTiker?: string;

  @IsString()
  @IsOptional()
  StartTokenDecimals?: string;

  @IsString()
  FinishTokenAddress: string;

  @IsString()
  @IsOptional()
  FinishTokenDecimals?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  TokenPoolsAddresses?: string[];

  @IsString()
  @IsOptional()
  NetworkMethod?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  DexesList?: string[];

  @IsString()
  SlippagePercent: string;

  @IsString()
  @IsOptional()
  native_token_ticker?: string;

  @IsNumber()
  @IsOptional()
  native_token_decimals?: number;

  swapParams: SolanaSwapParams | EVMSwapParams;
}

export class SpreadEntry {
  @IsString()
  @IsOptional()
  Ticker?: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  AlertLevelUSD?: number;

  @IsString()
  from_network: string;

  @IsString()
  to_network: string;

  @IsString()
  from_network_name: string;

  @IsString()
  to_network_name: string;

  @IsBoolean()
  @IsOptional()
  spread_active?: boolean;

  @IsString()
  @IsOptional()
  SpreadLifeTime?: string;

  @IsNumber()
  @IsOptional()
  swap_fee_buy?: number;

  @IsNumber()
  @IsOptional()
  swap_fee_sell?: number;

  @IsNumber()
  @IsOptional()
  last_alert_ts?: number | null;

  @IsNumber()
  @IsOptional()
  appear_spread_timestamp?: number | null;

  @IsNumber()
  @IsOptional()
  last_check_spread_timestamp?: number;

  @IsNumber()
  @IsOptional()
  bye_price_changed_percentage?: number | null;

  @IsNumber()
  @IsOptional()
  sell_price_changed_percentage?: number | null;

  @IsString()
  @IsOptional()
  CustomNotificationHTML?: string;

  @IsNumber()
  from_network_amount_in_tokens: number;

  @IsNumber()
  to_network_amount_in_tokens: number;

  @IsNumber()
  @IsOptional()
  last_spread_in_usd?: number;

  @IsNumber()
  old_buy_price: number;

  @IsNumber()
  new_buy_price: number;

  @IsNumber()
  old_sell_price: number;

  @IsNumber()
  new_sell_price: number;
}

export class Config {
  @IsString()
  Enabled: string;

  @IsString()
  @IsOptional()
  Ticker?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmountIn)
  Amounts_In: AmountIn[];

  @IsString()
  Directions: string;

  @IsString()
  @IsOptional()
  CustomNotificationHTML?: string;

  @ValidateNested()
  @Type(() => NetworkConfig)
  Network0: NetworkConfig;

  @ValidateNested()
  @Type(() => NetworkConfig)
  Network1: NetworkConfig;

  @IsNumber()
  @IsOptional()
  ws_updates?: number;

  @IsBoolean()
  @IsOptional()
  spread_active?: boolean;

  @IsString()
  @IsOptional()
  TGChannel?: string;

  @IsString()
  @IsOptional()
  TGTopic?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  DexesList0?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  DexesList1?: string[];

  @IsString()
  @IsOptional()
  SlippagePercent0: string;

  @IsString()
  @IsOptional()
  SlippagePercent1: string;

  @IsString()
  @IsOptional()
  SpreadLifeTime?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  type?: string;

  @ValidateNested()
  @Type(() => Config)
  @IsNotEmpty()
  config: Config;

  @ValidateNested()
  @Type(() => SpreadEntry)
  @IsNotEmpty()
  spread_entry: SpreadEntry;
}
