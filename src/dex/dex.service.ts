import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Dex } from "../entities/dex.entity";
import { CreateDexDto } from "./dto/create-dex.dto";
import { UpdateDexDto } from "./dto/update-dex.dto";

/**
 * Service handling DEX CRUD operations
 */
@Injectable()
export class DexService {
  constructor(
    @InjectRepository(Dex)
    private readonly dexRepository: Repository<Dex>,
  ) {}

  /**
   * Create a new DEX
   * @param createDexDto - Data for creating a DEX
   * @returns Created DEX entity
   * @throws ConflictException if DEX with same name already exists
   */
  async create(createDexDto: CreateDexDto): Promise<Dex> {
    const existingDex = await this.dexRepository.findOne({
      where: { name: createDexDto.name },
    });
    if (existingDex) {
      throw new ConflictException(`DEX with name '${createDexDto.name}' already exists`);
    }
    const dex = this.dexRepository.create(createDexDto);
    return this.dexRepository.save(dex);
  }

  /**
   * Get all DEXes
   * @returns Array of all DEX entities
   */
  async findAll(): Promise<Dex[]> {
    return this.dexRepository.find({
      order: { name: "ASC" },
    });
  }

  /**
   * Get a DEX by ID
   * @param id - DEX UUID
   * @returns DEX entity
   * @throws NotFoundException if DEX not found
   */
  async findOne(id: string): Promise<Dex> {
    const dex = await this.dexRepository.findOne({ where: { id } });
    if (!dex) {
      throw new NotFoundException(`DEX with ID '${id}' not found`);
    }
    return dex;
  }

  /**
   * Update a DEX
   * @param id - DEX UUID
   * @param updateDexDto - Data to update
   * @returns Updated DEX entity
   * @throws NotFoundException if DEX not found
   * @throws ConflictException if updating name to existing name
   */
  async update(id: string, updateDexDto: UpdateDexDto): Promise<Dex> {
    const dex = await this.findOne(id);
    if (updateDexDto.name && updateDexDto.name !== dex.name) {
      const existingDex = await this.dexRepository.findOne({
        where: { name: updateDexDto.name },
      });
      if (existingDex) {
        throw new ConflictException(`DEX with name '${updateDexDto.name}' already exists`);
      }
    }
    Object.assign(dex, updateDexDto);
    return this.dexRepository.save(dex);
  }

  /**
   * Delete a DEX
   * @param id - DEX UUID
   * @throws NotFoundException if DEX not found
   */
  async remove(id: string): Promise<void> {
    const dex = await this.findOne(id);
    await this.dexRepository.remove(dex);
  }
}
