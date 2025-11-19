// API Client for Arb Engine

import {
  Dex,
  CreateDexDto,
  UpdateDexDto,
  Token,
  CreateTokenDto,
  UpdateTokenDto,
  CreateTokenAddressDto,
  UpdateTokenAddressDto,
  TokenAddress,
  Pool,
  CreatePoolDto,
  UpdatePoolDto,
  Strategy,
  CreateStrategyDto,
  UpdateStrategyDto,
  ChainConfigDto,
  ConfigureChainsDto,
  EvmListenerStatus,
} from './types';

// Use Next.js proxy to avoid CORS issues
// All requests to /api/* will be proxied to the backend at localhost:3000
const API_BASE_URL = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const dexApi = {
  getAll: () => fetchApi<Dex[]>('/dexes'),
  getById: (id: string) => fetchApi<Dex>(`/dexes/${id}`),
  create: (data: CreateDexDto) =>
    fetchApi<Dex>('/dexes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateDexDto) =>
    fetchApi<Dex>(`/dexes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/dexes/${id}`, {
      method: 'DELETE',
    }),
};

export const tokenApi = {
  getAll: () => fetchApi<Token[]>('/tokens'),
  getById: (id: string) => fetchApi<Token>(`/tokens/${id}`),
  create: (data: CreateTokenDto) =>
    fetchApi<Token>('/tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateTokenDto) =>
    fetchApi<Token>(`/tokens/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/tokens/${id}`, {
      method: 'DELETE',
    }),
  addAddress: (tokenId: string, data: CreateTokenAddressDto) =>
    fetchApi<TokenAddress>(`/tokens/${tokenId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAddress: (tokenId: string, addressId: string, data: UpdateTokenAddressDto) =>
    fetchApi<TokenAddress>(`/tokens/${tokenId}/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAddress: (tokenId: string, addressId: string) =>
    fetchApi<void>(`/tokens/${tokenId}/addresses/${addressId}`, {
      method: 'DELETE',
    }),
};

export const poolApi = {
  getAll: () => fetchApi<Pool[]>('/pools'),
  getById: (id: string) => fetchApi<Pool>(`/pools/${id}`),
  getCrossChain: (tokenAddress: string, chainId: number) =>
    fetchApi<Pool[]>(`/pools/cross-chain?tokenAddress=${tokenAddress}&chainId=${chainId}`),
  getOnChain: (tokenAddress: string, chainId: number) =>
    fetchApi<Pool[]>(`/pools/on-chain?tokenAddress=${tokenAddress}&chainId=${chainId}`),
  getByPair: (token0Address: string, token1Address: string, chainId: number) =>
    fetchApi<Pool[]>(
      `/pools/by-pair?token0Address=${token0Address}&token1Address=${token1Address}&chainId=${chainId}`
    ),
  getByAddress: (poolAddress: string, chainId: number) =>
    fetchApi<Pool | null>(`/pools/by-address?poolAddress=${poolAddress}&chainId=${chainId}`),
  create: (data: CreatePoolDto) =>
    fetchApi<Pool>('/pools', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdatePoolDto) =>
    fetchApi<Pool>(`/pools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/pools/${id}`, {
      method: 'DELETE',
    }),
};

export const strategyApi = {
  getAll: () => fetchApi<Strategy[]>('/strategies'),
  getById: (id: string) => fetchApi<Strategy>(`/strategies/${id}`),
  getByType: (type: string) =>
    fetchApi<Strategy[]>(`/strategies/by-type?type=${type}`),
  create: (data: CreateStrategyDto) =>
    fetchApi<Strategy>('/strategies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateStrategyDto) =>
    fetchApi<Strategy>(`/strategies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/strategies/${id}`, {
      method: 'DELETE',
    }),
  addPool: (strategyId: string, poolId: string) =>
    fetchApi<Strategy>(`/strategies/${strategyId}/pools/${poolId}`, {
      method: 'POST',
    }),
  removePool: (strategyId: string, poolId: string) =>
    fetchApi<Strategy>(`/strategies/${strategyId}/pools/${poolId}`, {
      method: 'DELETE',
    }),
};

export const evmListenerApi = {
  configure: (data: ConfigureChainsDto) =>
    fetchApi<EvmListenerStatus>('/evm-listener/configure', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addChain: (data: ChainConfigDto) =>
    fetchApi<EvmListenerStatus>('/evm-listener/chain', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeChain: (chainId: number) =>
    fetchApi<EvmListenerStatus>(`/evm-listener/chain/${chainId}`, {
      method: 'DELETE',
    }),
  restartChain: (chainId: number) =>
    fetchApi<EvmListenerStatus>(`/evm-listener/chain/${chainId}/restart`, {
      method: 'POST',
    }),
  stopAll: () =>
    fetchApi<EvmListenerStatus>('/evm-listener/stop-all', {
      method: 'POST',
    }),
  getStatus: () => fetchApi<EvmListenerStatus>('/evm-listener/status'),
  getChainStatus: (chainId: number) =>
    fetchApi<EvmListenerStatus>(`/evm-listener/status/${chainId}`),
  getChains: () => fetchApi<EvmListenerStatus>('/evm-listener/chains'),
};

export { ApiError };
