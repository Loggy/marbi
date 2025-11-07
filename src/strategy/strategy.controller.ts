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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { StrategyService } from "./strategy.service";
import { CreateStrategyDto } from "./dto/create-strategy.dto";
import { UpdateStrategyDto } from "./dto/update-strategy.dto";
import { Strategy } from "../entities/strategy.entity";

/**
 * Controller handling Strategy CRUD operations and pool management
 */
@ApiTags("strategies")
@Controller("strategies")
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  /**
   * Create a new Strategy
   */
  @Post()
  @ApiOperation({ summary: "Create a new Strategy" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Strategy created successfully",
    type: Strategy,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async create(@Body() createStrategyDto: CreateStrategyDto): Promise<Strategy> {
    return this.strategyService.create(createStrategyDto);
  }

  /**
   * Get all Strategies
   */
  @Get()
  @ApiOperation({ summary: "Get all Strategies with their pools" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of all Strategies",
    type: [Strategy],
  })
  async findAll(): Promise<Strategy[]> {
    return this.strategyService.findAll();
  }

  /**
   * Find strategies by type
   */
  @Get("by-type")
  @ApiOperation({ summary: "Find strategies by type" })
  @ApiQuery({ name: "type", description: "Strategy type" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of strategies matching the type",
    type: [Strategy],
  })
  async findByType(@Query("type") type: string): Promise<Strategy[]> {
    return this.strategyService.findByType(type);
  }

  /**
   * Get a single Strategy by ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a Strategy by ID with its pools" })
  @ApiParam({ name: "id", description: "Strategy UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Strategy found",
    type: Strategy,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Strategy not found",
  })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Strategy> {
    return this.strategyService.findOne(id);
  }

  /**
   * Update a Strategy
   */
  @Put(":id")
  @ApiOperation({ summary: "Update a Strategy" })
  @ApiParam({ name: "id", description: "Strategy UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Strategy updated successfully",
    type: Strategy,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Strategy not found",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateStrategyDto: UpdateStrategyDto,
  ): Promise<Strategy> {
    return this.strategyService.update(id, updateStrategyDto);
  }

  /**
   * Delete a Strategy
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a Strategy" })
  @ApiParam({ name: "id", description: "Strategy UUID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Strategy deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Strategy not found",
  })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.strategyService.remove(id);
  }

  /**
   * Add a pool to a strategy
   */
  @Post(":id/pools/:poolId")
  @ApiOperation({ summary: "Add a pool to a strategy" })
  @ApiParam({ name: "id", description: "Strategy UUID" })
  @ApiParam({ name: "poolId", description: "Pool UUID to add" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Pool added to strategy successfully",
    type: Strategy,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Strategy or Pool not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Pool is already assigned to another strategy",
  })
  async addPool(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("poolId", ParseUUIDPipe) poolId: string,
  ): Promise<Strategy> {
    return this.strategyService.addPool(id, poolId);
  }

  /**
   * Remove a pool from a strategy
   */
  @Delete(":id/pools/:poolId")
  @ApiOperation({ summary: "Remove a pool from a strategy" })
  @ApiParam({ name: "id", description: "Strategy UUID" })
  @ApiParam({ name: "poolId", description: "Pool UUID to remove" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Pool removed from strategy successfully",
    type: Strategy,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Strategy or Pool not found",
  })
  async removePool(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("poolId", ParseUUIDPipe) poolId: string,
  ): Promise<Strategy> {
    return this.strategyService.removePool(id, poolId);
  }
}
