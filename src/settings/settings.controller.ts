import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { InitializeDto } from "./dto/initialize.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { LoggerService } from "src/logger/logger.service";

@ApiTags("settings")
@Controller("settings")
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly logger: LoggerService
  ) {}

  @Get("balance")
  @ApiOperation({ summary: "Get token balance" })
  @ApiQuery({ name: "chainId", description: "Chain ID of the network" })
  @ApiQuery({ name: "tokenAddress", description: "Address of the token" })
  @ApiResponse({
    status: 200,
    description: "Returns the token balance information",
    schema: {
      type: "object",
      properties: {
        balance: { type: "string" },
        decimals: { type: "number" },
        currentAllowance: { type: "string" },
        minAllowance: { type: "string" },
      },
    },
  })
  async getBalance(
    @Query("chainId") chainId: string,
    @Query("tokenAddress") tokenAddress: string
  ) {
    return await this.settingsService.updateTokenBalance({
      address: tokenAddress,
      chainId: chainId,
    });
  }

  @Post("initialize")
  @ApiOperation({ summary: "Initialize settings" })
  @ApiResponse({
    status: 200,
    description: "Settings initialized successfully",
    schema: {
      type: "object",
      properties: {
        evm: {
          type: "object",
          additionalProperties: true,
        },
        solana: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
  })
  async initialize(@Body() params: InitializeDto) {
    await this.settingsService.saveInitialize(params);
    const results = await this.settingsService.initialize(params);
    return results;
  }
}
