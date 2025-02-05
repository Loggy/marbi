import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { InitializeDto } from "./dto/initialize.dto";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("balance")
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
  async initialize(@Body() params: InitializeDto) {
    await this.settingsService.saveInitialize(params);
    return await this.settingsService.initialize(params);
  }
}
