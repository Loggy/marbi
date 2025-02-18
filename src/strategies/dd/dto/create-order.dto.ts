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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AmountIn {
  @ApiProperty({ description: 'Amount to be traded' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Alert level in USD' })
  @IsNumber()
  @IsOptional()
  AlertLevelUSD?: number;
}

export class Wallet {
  @ApiProperty({ description: 'Private key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Address' })
  @IsString()
  address: string;
}
export class NetworkConfig {
  @ApiProperty({ description: 'Name of the network (e.g., "solana", "ethereum")' })
  @IsString()
  NetworkName: string;

  @ApiProperty({ description: 'Address of the starting token' })
  @IsString()
  StartTokenAddress: string;

  @ApiPropertyOptional({ description: 'Ticker of the starting token' })
  @IsString()
  @IsOptional()
  StartTokenTiker?: string;

  @ApiPropertyOptional({ description: 'Decimals for the starting token' })
  @IsString()
  @IsOptional()
  StartTokenDecimals?: string;

  @ApiProperty({ description: 'Address of the finishing token' })
  @IsString()
  FinishTokenAddress: string;

  @ApiPropertyOptional({ description: 'Decimals for the finishing token' })
  @IsString()
  @IsOptional()
  FinishTokenDecimals?: string;

  @ApiPropertyOptional({ description: 'List of token pool addresses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  TokenPoolsAddresses?: string[];

  @ApiPropertyOptional({ description: 'Network method' })
  @IsString()
  @IsOptional()
  NetworkMethod?: string;

  @ApiPropertyOptional({ description: 'List of dexes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  DexesList?: string[];

  @ApiProperty({ description: 'Slippage percent' })
  @IsString()
  SlippagePercent: string;

  @ApiPropertyOptional({ description: 'Native token ticker' })
  @IsString()
  @IsOptional()
  native_token_ticker?: string;

  @ApiPropertyOptional({ description: 'Native token decimals' })
  @IsNumber()
  @IsOptional()
  native_token_decimals?: number;

  @ApiProperty({ description: 'Swap parameters for the network' })
  swapParams: SolanaSwapParams | EVMSwapParams;

  // @ApiProperty({ description: 'Private key for the network' })
  // @IsString()
  // privateKey: string;

  // @ApiProperty({ description: 'Address for the network' })
  // @IsString()
  // address: string;

  wallet: Wallet;
}

export class SpreadEntry {
  @ApiPropertyOptional({ description: 'Ticker symbol for the spread, if any' })
  @IsString()
  @IsOptional()
  Ticker?: string;

  @ApiProperty({ description: 'Amount used in the spread' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Alert level in USD for the spread' })
  @IsNumber()
  @IsOptional()
  AlertLevelUSD?: number;

  @ApiProperty({ description: 'Source network identifier' })
  @IsString()
  from_network: string;

  @ApiProperty({ description: 'Destination network identifier' })
  @IsString()
  to_network: string;

  @ApiProperty({ description: 'Source network name' })
  @IsString()
  from_network_name: string;

  @ApiProperty({ description: 'Destination network name' })
  @IsString()
  to_network_name: string;

  @ApiPropertyOptional({ description: 'Flag indicating if spread is active' })
  @IsBoolean()
  @IsOptional()
  spread_active?: boolean;

  @ApiPropertyOptional({ description: 'Lifetime of the spread in string format' })
  @IsString()
  @IsOptional()
  SpreadLifeTime?: string;

  @ApiPropertyOptional({ description: 'Swap fee when buying' })
  @IsNumber()
  @IsOptional()
  swap_fee_buy?: number;

  @ApiPropertyOptional({ description: 'Swap fee when selling' })
  @IsNumber()
  @IsOptional()
  swap_fee_sell?: number;

  @ApiPropertyOptional({ description: 'Timestamp of the last alert' })
  @IsNumber()
  @IsOptional()
  last_alert_ts?: number | null;

  @ApiPropertyOptional({ description: 'Timestamp when spread appeared' })
  @IsNumber()
  @IsOptional()
  appear_spread_timestamp?: number | null;

  @ApiPropertyOptional({ description: 'Timestamp when spread was last checked' })
  @IsNumber()
  @IsOptional()
  last_check_spread_timestamp?: number;

  @ApiPropertyOptional({ description: 'Percentage change in buy price' })
  @IsNumber()
  @IsOptional()
  bye_price_changed_percentage?: number | null;

  @ApiPropertyOptional({ description: 'Percentage change in sell price' })
  @IsNumber()
  @IsOptional()
  sell_price_changed_percentage?: number | null;

  @ApiPropertyOptional({ description: 'Custom HTML for notifications' })
  @IsString()
  @IsOptional()
  CustomNotificationHTML?: string;

  @ApiProperty({ description: 'Input token amount on the source network' })
  from_network_amount_in_tokens: string;

  @ApiProperty({ description: 'Input token amount on the destination network' })
  to_network_amount_in_tokens: string;

  @ApiPropertyOptional({ description: 'Last spread value in USD' })
  @IsNumber()
  @IsOptional()
  last_spread_in_usd?: number;

  @ApiProperty({ description: 'Old buy price' })
  @IsNumber()
  old_buy_price: number;

  @ApiProperty({ description: 'New buy price' })
  @IsNumber()
  new_buy_price: number;

  @ApiProperty({ description: 'Old sell price' })
  @IsNumber()
  old_sell_price: number;

  @ApiProperty({ description: 'New sell price' })
  @IsNumber()
  new_sell_price: number;
}

export class Config {
  @ApiProperty({ description: 'Enabled flag' })
  @IsString()
  Enabled: string;

  @ApiPropertyOptional({ description: 'Ticker symbol' })
  @IsString()
  @IsOptional()
  Ticker?: string;

  @ApiProperty({ description: 'Input amounts array', type: [AmountIn] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmountIn)
  Amounts_In: AmountIn[];

  @ApiProperty({ description: 'Trading directions' })
  @IsString()
  Directions: string;

  @ApiPropertyOptional({ description: 'Custom notification HTML' })
  @IsString()
  @IsOptional()
  CustomNotificationHTML?: string;

  @ApiProperty({ description: 'Configuration for Network0' })
  @ValidateNested()
  @Type(() => NetworkConfig)
  Network0: NetworkConfig;

  @ApiProperty({ description: 'Configuration for Network1' })
  @ValidateNested()
  @Type(() => NetworkConfig)
  Network1: NetworkConfig;

  @ApiPropertyOptional({ description: 'Websocket update interval in seconds' })
  @IsNumber()
  @IsOptional()
  ws_updates?: number;

  @ApiPropertyOptional({ description: 'Spread active flag' })
  @IsBoolean()
  @IsOptional()
  spread_active?: boolean;

  @ApiPropertyOptional({ description: 'Telegram channel' })
  @IsString()
  @IsOptional()
  TGChannel?: string;

  @ApiPropertyOptional({ description: 'Telegram topic' })
  @IsString()
  @IsOptional()
  TGTopic?: string;

  @ApiPropertyOptional({ description: 'Dexes list for Network0', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  DexesList0?: string[];

  @ApiPropertyOptional({ description: 'Dexes list for Network1', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  DexesList1?: string[];

  @ApiPropertyOptional({ description: 'Slippage percent for Network0' })
  @IsString()
  @IsOptional()
  SlippagePercent0: string;

  @ApiPropertyOptional({ description: 'Slippage percent for Network1' })
  @IsString()
  @IsOptional()
  SlippagePercent1: string;

  @ApiPropertyOptional({ description: 'Spread lifetime' })
  @IsString()
  @IsOptional()
  SpreadLifeTime?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Order type' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Order configuration' })
  @ValidateNested()
  @Type(() => Config)
  @IsNotEmpty()
  config: Config;

  @ApiProperty({ description: 'Spread entry details' })
  @ValidateNested()
  @Type(() => SpreadEntry)
  @IsNotEmpty()
  spread_entry: SpreadEntry;
}
