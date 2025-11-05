import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { PoolService } from "./pool.service";
import { CreatePoolDto } from "./dto/create-pool.dto";
import { UpdatePoolDto } from "./dto/update-pool.dto";
import { Pool } from "../entities/pool.entity";

/**
 * Controller handling Pool CRUD operations and specialized queries
 */
@ApiTags("pools")
@Controller("pools")
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  /**
   * Create a new Pool
   */
  @Post()
  @ApiOperation({ summary: "Create a new Pool" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Pool created successfully",
    type: Pool,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Pool already exists at this address/chain",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async create(@Body() createPoolDto: CreatePoolDto): Promise<Pool> {
    return this.poolService.create(createPoolDto);
  }

  /**
   * Get all Pools
   */
  @Get()
  @ApiOperation({ summary: "Get all Pools with their relations" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of all Pools",
    type: [Pool],
  })
  async findAll(): Promise<Pool[]> {
    return this.poolService.findAll();
  }

  /**
   * Find pools containing a token across all chains
   */
  @Get("cross-chain")
  @ApiOperation({
    summary: "Find all pools containing a token across all chains",
    description: "Given a token address on a specific chain, finds all pools (on any chain) that contain this canonical token",
  })
  @ApiQuery({ name: "tokenAddress", description: "Token address" })
  @ApiQuery({ name: "chainId", description: "Chain ID where token exists" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of pools across all chains",
    type: [Pool],
  })
  async findCrossChainPools(
    @Query("tokenAddress") tokenAddress: string,
    @Query("chainId", ParseIntPipe) chainId: number,
  ): Promise<Pool[]> {
    return this.poolService.findCrossChainPools(tokenAddress, chainId);
  }

  /**
   * Find pools on a specific chain containing a token
   */
  @Get("on-chain")
  @ApiOperation({
    summary: "Find pools on a specific chain containing a token",
  })
  @ApiQuery({ name: "tokenAddress", description: "Token address" })
  @ApiQuery({ name: "chainId", description: "Chain ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of pools on the specified chain",
    type: [Pool],
  })
  async findPoolsOnChain(
    @Query("tokenAddress") tokenAddress: string,
    @Query("chainId", ParseIntPipe) chainId: number,
  ): Promise<Pool[]> {
    return this.poolService.findPoolsOnChain(tokenAddress, chainId);
  }

  /**
   * Find pools for a token pair on a specific chain
   */
  @Get("by-pair")
  @ApiOperation({
    summary: "Find all pools for a token pair on a specific chain",
  })
  @ApiQuery({ name: "token0Address", description: "First token address" })
  @ApiQuery({ name: "token1Address", description: "Second token address" })
  @ApiQuery({ name: "chainId", description: "Chain ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of pools for this token pair",
    type: [Pool],
  })
  async findPoolsByPair(
    @Query("token0Address") token0Address: string,
    @Query("token1Address") token1Address: string,
    @Query("chainId", ParseIntPipe) chainId: number,
  ): Promise<Pool[]> {
    return this.poolService.findPoolsByPair(
      token0Address,
      token1Address,
      chainId,
    );
  }

  /**
   * Find pool by address on a specific chain
   */
  @Get("by-address")
  @ApiOperation({
    summary: "Find pool by its address on a specific chain",
  })
  @ApiQuery({ name: "poolAddress", description: "Pool contract address" })
  @ApiQuery({ name: "chainId", description: "Chain ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Pool found",
    type: Pool,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pool not found",
  })
  async findPoolByAddress(
    @Query("poolAddress") poolAddress: string,
    @Query("chainId", ParseIntPipe) chainId: number,
  ): Promise<Pool | null> {
    return this.poolService.findPoolByAddress(poolAddress, chainId);
  }

  /**
   * Get a single Pool by ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a Pool by ID with its relations" })
  @ApiParam({ name: "id", description: "Pool UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Pool found",
    type: Pool,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pool not found",
  })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Pool> {
    return this.poolService.findOne(id);
  }

  /**
   * Update a Pool
   */
  @Put(":id")
  @ApiOperation({ summary: "Update a Pool" })
  @ApiParam({ name: "id", description: "Pool UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Pool updated successfully",
    type: Pool,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pool not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Pool already exists at this address/chain",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updatePoolDto: UpdatePoolDto,
  ): Promise<Pool> {
    return this.poolService.update(id, updatePoolDto);
  }

  /**
   * Delete a Pool
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a Pool" })
  @ApiParam({ name: "id", description: "Pool UUID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Pool deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pool not found",
  })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.poolService.remove(id);
  }
}
