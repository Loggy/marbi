import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Strategy } from "../entities/strategy.entity";
import { Pool } from "../entities/pool.entity";
import { CreateStrategyDto } from "./dto/create-strategy.dto";
import { UpdateStrategyDto } from "./dto/update-strategy.dto";

/**
 * StrategyService provides CRUD operations for Strategy entities.
 * Handles strategy management with their associated pools.
 */
@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(Strategy)
    private readonly strategyRepository: Repository<Strategy>,
    @InjectRepository(Pool)
    private readonly poolRepository: Repository<Pool>
  ) {}

  /**
   * Create a new Strategy
   * @param createStrategyDto - Data for creating a Strategy
   * @returns Created Strategy entity with relations
   */
  async create(createStrategyDto: CreateStrategyDto): Promise<Strategy> {
    const strategy = this.strategyRepository.create({
      type: createStrategyDto.type,
    });
    const savedStrategy = await this.strategyRepository.save(strategy);
    return this.findOne(savedStrategy.id);
  }

  /**
   * Get all Strategies with their pools
   * @returns Array of all Strategy entities with pools
   */
  async findAll(): Promise<Strategy[]> {
    return this.strategyRepository.find({
      relations: ["pools", "pools.token0", "pools.token1", "pools.dex"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get a Strategy by ID with its pools
   * @param id - Strategy UUID
   * @returns Strategy entity with relations
   * @throws NotFoundException if Strategy not found
   */
  async findOne(id: string): Promise<Strategy> {
    const strategy = await this.strategyRepository.findOne({
      where: { id },
      relations: ["pools", "pools.token0", "pools.token1", "pools.dex"],
    });
    if (!strategy) {
      throw new NotFoundException(`Strategy with ID '${id}' not found`);
    }
    return strategy;
  }

  /**
   * Update a Strategy
   * @param id - Strategy UUID
   * @param updateStrategyDto - Data to update
   * @returns Updated Strategy entity with relations
   * @throws NotFoundException if Strategy not found
   */
  async update(id: string, updateStrategyDto: UpdateStrategyDto): Promise<Strategy> {
    const strategy = await this.strategyRepository.findOne({ where: { id } });
    if (!strategy) {
      throw new NotFoundException(`Strategy with ID '${id}' not found`);
    }
    if (updateStrategyDto.type) {
      strategy.type = updateStrategyDto.type;
    }
    await this.strategyRepository.save(strategy);
    return this.findOne(id);
  }

  /**
   * Delete a Strategy
   * @param id - Strategy UUID
   * @throws NotFoundException if Strategy not found
   */
  async remove(id: string): Promise<void> {
    const strategy = await this.strategyRepository.findOne({ where: { id } });
    if (!strategy) {
      throw new NotFoundException(`Strategy with ID '${id}' not found`);
    }
    await this.strategyRepository.remove(strategy);
  }

  /**
   * Add a pool to a strategy
   * @param strategyId - Strategy UUID
   * @param poolId - Pool UUID
   * @returns Updated Strategy with pools
   * @throws NotFoundException if Strategy or Pool not found
   * @throws ConflictException if Pool is already assigned to another strategy
   */
  async addPool(strategyId: string, poolId: string): Promise<Strategy> {
    const strategy = await this.strategyRepository.findOne({
      where: { id: strategyId },
    });
    if (!strategy) {
      throw new NotFoundException(`Strategy with ID '${strategyId}' not found`);
    }
    const pool = await this.poolRepository.findOne({
      where: { id: poolId },
      relations: ["strategy"],
    });
    if (!pool) {
      throw new NotFoundException(`Pool with ID '${poolId}' not found`);
    }
    if (pool.strategyId && pool.strategyId !== strategyId) {
      throw new ConflictException(
        `Pool is already assigned to strategy '${pool.strategyId}'`
      );
    }
    pool.strategyId = strategyId;
    await this.poolRepository.save(pool);
    return this.findOne(strategyId);
  }

  /**
   * Remove a pool from a strategy
   * @param strategyId - Strategy UUID
   * @param poolId - Pool UUID
   * @returns Updated Strategy without the pool
   * @throws NotFoundException if Strategy or Pool not found
   */
  async removePool(strategyId: string, poolId: string): Promise<Strategy> {
    const strategy = await this.strategyRepository.findOne({
      where: { id: strategyId },
    });
    if (!strategy) {
      throw new NotFoundException(`Strategy with ID '${strategyId}' not found`);
    }
    const pool = await this.poolRepository.findOne({
      where: { id: poolId },
    });
    if (!pool) {
      throw new NotFoundException(`Pool with ID '${poolId}' not found`);
    }
    pool.strategyId = null;
    await this.poolRepository.save(pool);
    return this.findOne(strategyId);
  }

  /**
   * Find strategies by type
   * @param type - Strategy type
   * @returns Array of strategies matching the type
   */
  async findByType(type: string): Promise<Strategy[]> {
    return this.strategyRepository.find({
      where: { type },
      relations: ["pools", "pools.token0", "pools.token1", "pools.dex"],
      order: { createdAt: "DESC" },
    });
  }
}
