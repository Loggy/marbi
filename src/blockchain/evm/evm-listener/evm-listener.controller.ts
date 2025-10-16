import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { EVMListenerService } from "./evm-listener.service";
import { ConfigureChainsDto, ChainConfigDto } from "./dto/configure-chains.dto";

@ApiTags("EVM Listener")
@Controller("evm-listener")
export class EVMListenerController {
  constructor(private readonly evmListenerService: EVMListenerService) {}

  @Post("configure")
  @ApiOperation({ summary: "Configure chains to monitor for new blocks" })
  @ApiResponse({
    status: 200,
    description: "Chains configured successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid configuration",
  })
  async configureChains(@Body() dto: ConfigureChainsDto) {
    await this.evmListenerService.configureChains(dto.chains);
    return {
      success: true,
      message: `Configured ${dto.chains.length} chain(s)`,
      chains: dto.chains.map((c) => c.chainId),
    };
  }

  @Post("chain")
  @ApiOperation({ summary: "Add a single chain to monitor" })
  @ApiResponse({
    status: 200,
    description: "Chain added successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Failed to add chain",
  })
  async addChain(@Body() dto: ChainConfigDto) {
    const success = await this.evmListenerService.addChain(
      dto.chainId,
      dto.rpcUrl
    );
    
    return {
      success,
      message: success
        ? `Chain ${dto.chainId} added successfully`
        : `Failed to add chain ${dto.chainId}`,
      chainId: dto.chainId,
    };
  }

  @Delete("chain/:chainId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove a chain from monitoring" })
  @ApiParam({
    name: "chainId",
    description: "The chain ID to remove",
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: "Chain removed successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Chain not found",
  })
  async removeChain(@Param("chainId") chainId: string) {
    const success = await this.evmListenerService.removeChain(
      parseInt(chainId)
    );
    
    return {
      success,
      message: success
        ? `Chain ${chainId} removed successfully`
        : `Failed to remove chain ${chainId}`,
      chainId: parseInt(chainId),
    };
  }

  @Post("chain/:chainId/restart")
  @ApiOperation({ summary: "Restart monitoring for a specific chain" })
  @ApiParam({
    name: "chainId",
    description: "The chain ID to restart",
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: "Chain restarted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Chain not found",
  })
  async restartChain(@Param("chainId") chainId: string) {
    const success = await this.evmListenerService.restartWorker(
      parseInt(chainId)
    );
    
    return {
      success,
      message: success
        ? `Chain ${chainId} restarted successfully`
        : `Failed to restart chain ${chainId}`,
      chainId: parseInt(chainId),
    };
  }

  @Get("status")
  @ApiOperation({ summary: "Get status of all monitored chains" })
  @ApiResponse({
    status: 200,
    description: "Status retrieved successfully",
  })
  getStatus() {
    const workers = this.evmListenerService.getWorkersStatus();
    
    return {
      success: true,
      totalChains: workers.length,
      activeChains: workers.filter((w) => w.isActive).length,
      workers,
    };
  }

  @Get("status/:chainId")
  @ApiOperation({ summary: "Get status of a specific chain" })
  @ApiParam({
    name: "chainId",
    description: "The chain ID to check",
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: "Status retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Chain not found",
  })
  getChainStatus(@Param("chainId") chainId: string) {
    const status = this.evmListenerService.getWorkerStatus(parseInt(chainId));
    
    if (!status) {
      return {
        success: false,
        message: `Chain ${chainId} not found`,
        chainId: parseInt(chainId),
      };
    }

    return {
      success: true,
      ...status,
    };
  }

  @Get("chains")
  @ApiOperation({ summary: "Get list of all configured chain IDs" })
  @ApiResponse({
    status: 200,
    description: "Chain IDs retrieved successfully",
  })
  getConfiguredChains() {
    const chainIds = this.evmListenerService.getConfiguredChains();
    
    return {
      success: true,
      count: chainIds.length,
      chainIds,
    };
  }

  @Post("stop-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stop monitoring all chains" })
  @ApiResponse({
    status: 200,
    description: "All chains stopped successfully",
  })
  async stopAll() {
    await this.evmListenerService.stopAllWorkers();
    
    return {
      success: true,
      message: "All chain monitoring stopped",
    };
  }
}

