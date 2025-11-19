// API Types for Arb Engine

export interface Dex {
  id: string;
  name: string;
  swapTopic: string;
  addLiquidityTopic?: string;
  removeLiquidityTopic?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDexDto {
  name: string;
  swapTopic: string;
  addLiquidityTopic?: string;
  removeLiquidityTopic?: string;
}

export interface UpdateDexDto {
  name?: string;
  swapTopic?: string;
  addLiquidityTopic?: string;
  removeLiquidityTopic?: string;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  description?: string;
  stable?: boolean;
  addresses: TokenAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface TokenAddress {
  id: string;
  address: string;
  chainId: number;
  tokenId: string;
  decimals?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTokenDto {
  symbol: string;
  name: string;
  description?: string;
  addresses?: CreateTokenAddressDto[];
}

export interface CreateTokenAddressDto {
  address: string;
  chainId: number;
  decimals?: number;
}

export interface UpdateTokenDto {
  symbol?: string;
  name?: string;
  description?: string;
}

export interface UpdateTokenAddressDto {
  address?: string;
  chainId?: number;
  decimals?: number;
}

export interface Pool {
  id: string;
  poolAddress: string;
  chainId: number;
  token0Id: string;
  token0: Token;
  token0Address: string;
  token1Id: string;
  token1: Token;
  token1Address: string;
  dexId: string;
  dex: Dex;
  strategyId?: string;
  strategy?: Strategy;
  fee?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoolDto {
  poolAddress: string;
  chainId: number;
  token0Id: string;
  token0Address: string;
  token1Id: string;
  token1Address: string;
  dexId: string;
  fee?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdatePoolDto {
  poolAddress?: string;
  chainId?: number;
  token0Id?: string;
  token0Address?: string;
  token1Id?: string;
  token1Address?: string;
  dexId?: string;
  fee?: number;
  metadata?: Record<string, unknown>;
}

export interface Strategy {
  id: string;
  type: string;
  pools: Pool[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyDto {
  type: string;
}

export interface UpdateStrategyDto {
  type?: string;
}

export interface ChainConfigDto {
  chainId: number;
  rpcUrl: string;
}

export interface ConfigureChainsDto {
  chains: ChainConfigDto[];
}

export interface EvmListenerStatus {
  success: boolean;
  totalChains?: number;
  activeChains?: number;
  workers?: Array<{
    chainId: number;
    status: string;
    blockNumber?: number;
    latency?: number;
    errors?: number;
  }>;
  chainIds?: number[];
  count?: number;
  message?: string;
}

export interface ChainInfo {
  chainId: number;
  rpcUrl: string;
  status: string;
  blockNumber?: number;
  latency?: number;
  errors?: number;
}
