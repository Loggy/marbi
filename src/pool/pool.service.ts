import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Pool } from "../entities/pool.entity";
import { TokenAddress } from "../entities/token-address.entity";
import { Token } from "../entities/token.entity";
import { Dex } from "../entities/dex.entity";
import { CreatePoolDto } from "./dto/create-pool.dto";
import { UpdatePoolDto } from "./dto/update-pool.dto";

/**
 * PoolService provides efficient cross-chain pool querying capabilities.
 * Handles token-to-pool lookups with optimized database queries.
 */
@Injectable()
export class PoolService {
  constructor(
    @InjectRepository(Pool)
    private readonly poolRepository: Repository<Pool>,
    @InjectRepository(TokenAddress)
    private readonly tokenAddressRepository: Repository<TokenAddress>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(Dex)
    private readonly dexRepository: Repository<Dex>
  ) {}

  /**
   * Create a new Pool
   * @param createPoolDto - Data for creating a Pool
   * @returns Created Pool entity with relations
   * @throws ConflictException if pool already exists
   */
  async create(createPoolDto: CreatePoolDto): Promise<Pool> {
    const existingPool = await this.poolRepository.findOne({
      where: {
        poolAddress: createPoolDto.poolAddress.toLowerCase(),
        chainId: createPoolDto.chainId,
      },
    });
    if (existingPool) {
      throw new ConflictException(
        `Pool at address '${createPoolDto.poolAddress}' on chain ${createPoolDto.chainId} already exists`
      );
    }
    const pool = this.poolRepository.create({
      poolAddress: createPoolDto.poolAddress.toLowerCase(),
      chainId: createPoolDto.chainId,
      token0Id: createPoolDto.token0Id,
      token0Address: createPoolDto.token0Address.toLowerCase(),
      token1Id: createPoolDto.token1Id,
      token1Address: createPoolDto.token1Address.toLowerCase(),
      dexId: createPoolDto.dexId,
      fee: createPoolDto.fee,
      metadata: createPoolDto.metadata,
    });
    const savedPool = await this.poolRepository.save(pool);
    return this.findOne(savedPool.id);
  }

  /**
   * Get all Pools with their relations
   * @returns Array of all Pool entities with token0, token1, and dex
   */
  async findAll(): Promise<Pool[]> {
    return this.poolRepository.find({
      relations: ["token0", "token1", "dex"],
      order: { chainId: "ASC", poolAddress: "ASC" },
    });
  }

  /**
   * Get a Pool by ID with its relations
   * @param id - Pool UUID
   * @returns Pool entity with relations
   * @throws NotFoundException if Pool not found
   */
  async findOne(id: string): Promise<Pool> {
    const pool = await this.poolRepository.findOne({
      where: { id },
      relations: ["token0", "token1", "dex"],
    });
    if (!pool) {
      throw new NotFoundException(`Pool with ID '${id}' not found`);
    }
    return pool;
  }

  /**
   * Update a Pool
   * @param id - Pool UUID
   * @param updatePoolDto - Data to update
   * @returns Updated Pool entity with relations
   * @throws NotFoundException if Pool not found
   * @throws ConflictException if updating to existing pool address/chain
   */
  async update(id: string, updatePoolDto: UpdatePoolDto): Promise<Pool> {
    const pool = await this.poolRepository.findOne({ where: { id } });
    if (!pool) {
      throw new NotFoundException(`Pool with ID '${id}' not found`);
    }
    if (
      updatePoolDto.poolAddress &&
      updatePoolDto.chainId &&
      (updatePoolDto.poolAddress.toLowerCase() !== pool.poolAddress ||
        updatePoolDto.chainId !== pool.chainId)
    ) {
      const existingPool = await this.poolRepository.findOne({
        where: {
          poolAddress: updatePoolDto.poolAddress.toLowerCase(),
          chainId: updatePoolDto.chainId,
        },
      });
      if (existingPool && existingPool.id !== id) {
        throw new ConflictException(
          `Pool at address '${updatePoolDto.poolAddress}' on chain ${updatePoolDto.chainId} already exists`
        );
      }
    }
    if (updatePoolDto.poolAddress) {
      pool.poolAddress = updatePoolDto.poolAddress.toLowerCase();
    }
    if (updatePoolDto.chainId !== undefined) {
      pool.chainId = updatePoolDto.chainId;
    }
    if (updatePoolDto.token0Id) {
      pool.token0Id = updatePoolDto.token0Id;
    }
    if (updatePoolDto.token0Address) {
      pool.token0Address = updatePoolDto.token0Address.toLowerCase();
    }
    if (updatePoolDto.token1Id) {
      pool.token1Id = updatePoolDto.token1Id;
    }
    if (updatePoolDto.token1Address) {
      pool.token1Address = updatePoolDto.token1Address.toLowerCase();
    }
    if (updatePoolDto.dexId) {
      pool.dexId = updatePoolDto.dexId;
    }
    if (updatePoolDto.fee !== undefined) {
      pool.fee = updatePoolDto.fee;
    }
    if (updatePoolDto.metadata) {
      pool.metadata = updatePoolDto.metadata;
    }
    await this.poolRepository.save(pool);
    return this.findOne(id);
  }

  /**
   * Delete a Pool
   * @param id - Pool UUID
   * @throws NotFoundException if Pool not found
   */
  async remove(id: string): Promise<void> {
    const pool = await this.poolRepository.findOne({ where: { id } });
    if (!pool) {
      throw new NotFoundException(`Pool with ID '${id}' not found`);
    }
    await this.poolRepository.remove(pool);
  }

  /**
   * Find all pools containing a token across all chains.
   * Given a token address on a specific chain, finds all pools
   * (on any chain) that contain this canonical token.
   *
   * @param tokenAddress - Token address on source chain
   * @param sourceChainId - Chain ID where token address exists
   * @returns Array of pools containing this token across all chains
   */
  async findCrossChainPools(
    tokenAddress: string,
    sourceChainId: number
  ): Promise<Pool[]> {
    const tokenAddr = await this.tokenAddressRepository.findOne({
      where: {
        address: tokenAddress.toLowerCase(),
        chainId: sourceChainId,
      },
      relations: ["token"],
    });

    if (!tokenAddr) {
      return [];
    }

    return this.poolRepository
      .createQueryBuilder("pool")
      .leftJoinAndSelect("pool.token0", "token0")
      .leftJoinAndSelect("pool.token1", "token1")
      .leftJoinAndSelect("pool.dex", "dex")
      .where("pool.token0Id = :tokenId OR pool.token1Id = :tokenId", {
        tokenId: tokenAddr.tokenId,
      })
      .orderBy("pool.chainId", "ASC")
      .addOrderBy("dex.name", "ASC")
      .getMany();
  }

  /**
   * Find pool by its address on a specific chain.
   *
   * @param poolAddress - Pool contract address
   * @param chainId - Chain ID
   * @returns Pool entity or null
   */
  async findPoolByAddress(
    poolAddress: string,
    chainId: number
  ): Promise<Pool | null> {
    return this.poolRepository.findOne({
      where: {
        poolAddress: poolAddress.toLowerCase(),
        chainId,
      },
      relations: ["token0", "token0.addresses", "token1", "token1.addresses", "dex"],
    });
  }

  /**
   * Find all pools containing a token on a specific chain.
   *
   * @param tokenAddress - Token address
   * @param chainId - Chain ID to search on
   * @returns Array of pools on specified chain
   */
  async findPoolsOnChain(
    tokenAddress: string,
    chainId: number
  ): Promise<Pool[]> {
    const tokenAddr = await this.tokenAddressRepository.findOne({
      where: {
        address: tokenAddress.toLowerCase(),
        chainId,
      },
      relations: ["token"],
    });

    if (!tokenAddr) {
      return [];
    }

    return this.poolRepository
      .createQueryBuilder("pool")
      .leftJoinAndSelect("pool.token0", "token0")
      .leftJoinAndSelect("pool.token1", "token1")
      .leftJoinAndSelect("pool.dex", "dex")
      .where("pool.chainId = :chainId", { chainId })
      .andWhere("(pool.token0Id = :tokenId OR pool.token1Id = :tokenId)", {
        tokenId: tokenAddr.tokenId,
      })
      .orderBy("dex.name", "ASC")
      .getMany();
  }

  /**
   * Find all pools for a token pair on a specific chain.
   *
   * @param token0Address - First token address
   * @param token1Address - Second token address
   * @param chainId - Chain ID
   * @returns Array of pools for this token pair
   */
  async findPoolsByPair(
    token0Address: string,
    token1Address: string,
    chainId: number
  ): Promise<Pool[]> {
    const [tokenAddr0, tokenAddr1] = await Promise.all([
      this.tokenAddressRepository.findOne({
        where: {
          address: token0Address.toLowerCase(),
          chainId,
        },
        relations: ["token"],
      }),
      this.tokenAddressRepository.findOne({
        where: {
          address: token1Address.toLowerCase(),
          chainId,
        },
        relations: ["token"],
      }),
    ]);

    if (!tokenAddr0 || !tokenAddr1) {
      return [];
    }

    return this.poolRepository
      .createQueryBuilder("pool")
      .leftJoinAndSelect("pool.token0", "token0")
      .leftJoinAndSelect("pool.token1", "token1")
      .leftJoinAndSelect("pool.dex", "dex")
      .where("pool.chainId = :chainId", { chainId })
      .andWhere(
        "((pool.token0Id = :token0Id AND pool.token1Id = :token1Id) OR (pool.token0Id = :token1Id AND pool.token1Id = :token0Id))",
        {
          token0Id: tokenAddr0.tokenId,
          token1Id: tokenAddr1.tokenId,
        }
      )
      .orderBy("dex.name", "ASC")
      .getMany();
  }

  /**
   * Get or create a canonical token by symbol.
   * Helper method for token registry operations.
   *
   * @param symbol - Token symbol (e.g., "USDC")
   * @param name - Token name (e.g., "USD Coin")
   * @returns Token entity
   */
  async getOrCreateToken(symbol: string, name: string): Promise<Token> {
    let token = await this.tokenRepository.findOne({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!token) {
      token = this.tokenRepository.create({
        symbol: symbol.toUpperCase(),
        name,
      });
      await this.tokenRepository.save(token);
    }

    return token;
  }

  /**
   * Link a token address to a canonical token.
   * Creates or updates the TokenAddress mapping.
   *
   * @param tokenId - Canonical token ID
   * @param address - Token address on chain
   * @param chainId - Chain ID
   * @param decimals - Token decimals (optional)
   * @returns TokenAddress entity
   */
  async linkTokenAddress(
    tokenId: string,
    address: string,
    chainId: number,
    decimals?: number
  ): Promise<TokenAddress> {
    let tokenAddress = await this.tokenAddressRepository.findOne({
      where: {
        address: address.toLowerCase(),
        chainId,
      },
    });

    if (!tokenAddress) {
      tokenAddress = this.tokenAddressRepository.create({
        tokenId,
        address: address.toLowerCase(),
        chainId,
        decimals,
      });
    } else {
      if (decimals !== undefined) {
        tokenAddress.decimals = decimals;
      }
      if (tokenAddress.tokenId !== tokenId) {
        tokenAddress.tokenId = tokenId;
      }
    }

    return this.tokenAddressRepository.save(tokenAddress);
  }

  /**
   * Create or update a pool.
   *
   * @param params - Pool creation parameters
   * @returns Pool entity
   */
  async createOrUpdatePool(params: {
    poolAddress: string;
    chainId: number;
    token0Id: string;
    token0Address: string;
    token1Id: string;
    token1Address: string;
    dexId: string;
    fee?: number;
    metadata?: Record<string, any>;
  }): Promise<Pool> {
    let pool = await this.poolRepository.findOne({
      where: {
        poolAddress: params.poolAddress.toLowerCase(),
        chainId: params.chainId,
      },
    });

    if (!pool) {
      pool = this.poolRepository.create({
        poolAddress: params.poolAddress.toLowerCase(),
        chainId: params.chainId,
        token0Id: params.token0Id,
        token0Address: params.token0Address.toLowerCase(),
        token1Id: params.token1Id,
        token1Address: params.token1Address.toLowerCase(),
        dexId: params.dexId,
        fee: params.fee,
        metadata: params.metadata,
      });
    } else {
      pool.token0Id = params.token0Id;
      pool.token0Address = params.token0Address.toLowerCase();
      pool.token1Id = params.token1Id;
      pool.token1Address = params.token1Address.toLowerCase();
      pool.dexId = params.dexId;
      pool.fee = params.fee;
      if (params.metadata) {
        pool.metadata = params.metadata;
      }
    }

    return this.poolRepository.save(pool);
  }

  /**
   * Get or create a DEX by name.
   * Helper method for DEX registry operations.
   *
   * @param name - DEX name
   * @param swapTopic - Swap event topic
   * @param addLiquidityTopic - Add liquidity event topic (optional)
   * @param removeLiquidityTopic - Remove liquidity event topic (optional)
   * @returns Dex entity
   */
  async getOrCreateDex(
    name: string,
    swapTopic: string,
    addLiquidityTopic?: string,
    removeLiquidityTopic?: string
  ): Promise<Dex> {
    let dex = await this.dexRepository.findOne({
      where: { name },
    });

    if (!dex) {
      dex = this.dexRepository.create({
        name,
        swapTopic,
        addLiquidityTopic,
        removeLiquidityTopic,
      });
      await this.dexRepository.save(dex);
    }

    return dex;
  }

  /**
   * Find canonical token by address on any chain.
   *
   * @param address - Token address
   * @param chainId - Chain ID
   * @returns Token entity or null
   */
  async findTokenByAddress(
    address: string,
    chainId: number
  ): Promise<Token | null> {
    const tokenAddress = await this.tokenAddressRepository.findOne({
      where: {
        address: address.toLowerCase(),
        chainId,
      },
      relations: ["token"],
    });

    return tokenAddress?.token || null;
  }

  /**
   * Get all token addresses for a canonical token.
   *
   * @param tokenId - Canonical token ID
   * @returns Array of token addresses across chains
   */
  async getTokenAddresses(tokenId: string): Promise<TokenAddress[]> {
    return this.tokenAddressRepository.find({
      where: { tokenId },
      order: { chainId: "ASC" },
    });
  }
}
