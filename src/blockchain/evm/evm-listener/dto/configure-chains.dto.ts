import { IsNumber, IsString, IsArray, ValidateNested, Matches } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class ChainConfigDto {
  @ApiProperty({
    description: "The chain ID (e.g., 1 for Ethereum, 56 for BSC)",
    example: 1,
  })
  @IsNumber()
  chainId: number;

  @ApiProperty({
    description: "WebSocket RPC URL for the chain",
    example: "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY",
  })
  @IsString()
  @Matches(/^wss?:\/\//, { message: "RPC URL must be a valid WebSocket URL (ws:// or wss://)" })
  rpcUrl: string;
}

export class ConfigureChainsDto {
  @ApiProperty({
    description: "Array of chain configurations to monitor",
    type: [ChainConfigDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChainConfigDto)
  chains: ChainConfigDto[];
}

export class ChainIdDto {
  @ApiProperty({
    description: "The chain ID to operate on",
    example: 1,
  })
  @IsNumber()
  chainId: number;
}

