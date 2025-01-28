export interface AmountIn {
  amount: number;
  AlertLevelUSD: number;
}

export interface NetworkConfig {
  NetworkName: string;
  StartTokenAddress: string;
  StartTokenTiker: string;
  StartTokenDecimals: string;
  FinishTokenAddress: string;
  FinishTokenDecimals: string;
  TokenPoolsAddresses: string[];
  NetworkMethod: string;
  DexesList: string[];
  SlippagePercent: string;
  native_token_ticker: string;
  native_token_decimals: number;
}

export interface SpreadEntry {
  Ticker: string;
  amount: number;
  AlertLevelUSD: number;
  from_network: string;
  to_network: string;
  from_network_name: string;
  to_network_name: string;
  spread_active: boolean;
  SpreadLifeTime: string;
  swap_fee_buy: number;
  swap_fee_sell: number;
  last_alert_ts: number | null;
  appear_spread_timestamp: number | null;
  last_check_spread_timestamp: number;
  bye_price_changed_percentage: number | null;
  sell_price_changed_percentage: number | null;
  CustomNotificationHTML: string;
  from_network_amount_in_tokens: number;
  to_network_amount_in_tokens: number;
  last_spread_in_usd: number;
  old_buy_price: number;
  new_buy_price: number;
  old_sell_price: number;
  new_sell_price: number;
}

export interface Config {
  Enabled: string;
  Ticker: string;
  Amounts_In: AmountIn[];
  Directions: string;
  CustomNotificationHTML: string;
  Network0: NetworkConfig;
  Network1: NetworkConfig;
  ws_updates: number;
  spread_active: boolean;
  TGChannel: string;
  TGTopic: string;
  DexesList0: string[];
  DexesList1: string[];
  SlippagePercent0: string;
  SlippagePercent1: string;
  SpreadLifeTime: string;
}

export interface CreateOrderDto {
  type: string;
  config: Config;
  spread_entry: SpreadEntry;
} 