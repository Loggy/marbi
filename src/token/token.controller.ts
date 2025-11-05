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
import { TokenService } from "./token.service";
import { CreateTokenDto } from "./dto/create-token.dto";
import { UpdateTokenDto } from "./dto/update-token.dto";
import { CreateTokenAddressDto } from "./dto/create-token-address.dto";
import { UpdateTokenAddressDto } from "./dto/update-token-address.dto";
import { Token } from "../entities/token.entity";
import { TokenAddress } from "../entities/token-address.entity";

/**
 * Controller handling Token and TokenAddress CRUD operations
 */
@ApiTags("tokens")
@Controller("tokens")
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  /**
   * Create a new Token
   */
  @Post()
  @ApiOperation({ summary: "Create a new Token with optional addresses" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Token created successfully",
    type: Token,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async create(@Body() createTokenDto: CreateTokenDto): Promise<Token> {
    return this.tokenService.create(createTokenDto);
  }

  /**
   * Get all Tokens
   */
  @Get()
  @ApiOperation({ summary: "Get all Tokens with their addresses" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of all Tokens",
    type: [Token],
  })
  async findAll(): Promise<Token[]> {
    return this.tokenService.findAll();
  }

  /**
   * Get a single Token by ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a Token by ID with its addresses" })
  @ApiParam({ name: "id", description: "Token UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Token found",
    type: Token,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Token not found",
  })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Token> {
    return this.tokenService.findOne(id);
  }

  /**
   * Update a Token
   */
  @Put(":id")
  @ApiOperation({ summary: "Update a Token" })
  @ApiParam({ name: "id", description: "Token UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Token updated successfully",
    type: Token,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Token not found",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateTokenDto: UpdateTokenDto,
  ): Promise<Token> {
    return this.tokenService.update(id, updateTokenDto);
  }

  /**
   * Delete a Token
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a Token" })
  @ApiParam({ name: "id", description: "Token UUID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Token deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Token not found",
  })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.tokenService.remove(id);
  }

  /**
   * Add a TokenAddress to a Token
   */
  @Post(":id/addresses")
  @ApiOperation({ summary: "Add a new address to a Token" })
  @ApiParam({ name: "id", description: "Token UUID" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "TokenAddress added successfully",
    type: TokenAddress,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Token not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Address already exists on that chain",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async addAddress(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() createTokenAddressDto: CreateTokenAddressDto,
  ): Promise<TokenAddress> {
    return this.tokenService.addAddress(id, createTokenAddressDto);
  }

  /**
   * Update a TokenAddress
   */
  @Put(":id/addresses/:addressId")
  @ApiOperation({ summary: "Update a TokenAddress" })
  @ApiParam({ name: "id", description: "Token UUID" })
  @ApiParam({ name: "addressId", description: "TokenAddress UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "TokenAddress updated successfully",
    type: TokenAddress,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Token or TokenAddress not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Address/chain combination already exists",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async updateAddress(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("addressId", ParseUUIDPipe) addressId: string,
    @Body() updateTokenAddressDto: UpdateTokenAddressDto,
  ): Promise<TokenAddress> {
    return this.tokenService.updateAddress(id, addressId, updateTokenAddressDto);
  }

  /**
   * Delete a TokenAddress
   */
  @Delete(":id/addresses/:addressId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a TokenAddress from a Token" })
  @ApiParam({ name: "id", description: "Token UUID" })
  @ApiParam({ name: "addressId", description: "TokenAddress UUID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "TokenAddress deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Token or TokenAddress not found",
  })
  async removeAddress(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("addressId", ParseUUIDPipe) addressId: string,
  ): Promise<void> {
    return this.tokenService.removeAddress(id, addressId);
  }
}
