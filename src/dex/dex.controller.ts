import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { DexService } from "./dex.service";
import { CreateDexDto } from "./dto/create-dex.dto";
import { UpdateDexDto } from "./dto/update-dex.dto";
import { Dex } from "../entities/dex.entity";

/**
 * Controller handling DEX CRUD operations
 */
@ApiTags("dexes")
@Controller("dexes")
export class DexController {
  constructor(private readonly dexService: DexService) {}

  /**
   * Create a new DEX
   */
  @Post()
  @ApiOperation({ summary: "Create a new DEX" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "DEX created successfully",
    type: Dex,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "DEX with same name already exists",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async create(@Body() createDexDto: CreateDexDto): Promise<Dex> {
    return this.dexService.create(createDexDto);
  }

  /**
   * Get all DEXes
   */
  @Get()
  @ApiOperation({ summary: "Get all DEXes" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of all DEXes",
    type: [Dex],
  })
  async findAll(): Promise<Dex[]> {
    return this.dexService.findAll();
  }

  /**
   * Get a single DEX by ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a DEX by ID" })
  @ApiParam({ name: "id", description: "DEX UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "DEX found",
    type: Dex,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "DEX not found",
  })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Dex> {
    return this.dexService.findOne(id);
  }

  /**
   * Update a DEX
   */
  @Put(":id")
  @ApiOperation({ summary: "Update a DEX" })
  @ApiParam({ name: "id", description: "DEX UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "DEX updated successfully",
    type: Dex,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "DEX not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "DEX with same name already exists",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDexDto: UpdateDexDto,
  ): Promise<Dex> {
    return this.dexService.update(id, updateDexDto);
  }

  /**
   * Delete a DEX
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a DEX" })
  @ApiParam({ name: "id", description: "DEX UUID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "DEX deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "DEX not found",
  })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.dexService.remove(id);
  }
}
