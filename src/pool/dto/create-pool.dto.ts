import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating a new Pool
 */
export class CreatePoolDto {
  @ApiProperty({ description: "Pool contract address" })
  @IsString()
  @IsNotEmpty()
  poolAddress: string;

  @ApiProperty({ description: "Blockchain chain ID" })
  @IsNumber()
  chainId: number;

  @ApiProperty({ description: "Token 0 canonical ID (UUID)" })
  @IsUUID()
  token0Id: string;

  @ApiProperty({ description: "Token 0 address on the chain" })
  @IsString()
  @IsNotEmpty()
  token0Address: string;

  @ApiProperty({ description: "Token 1 canonical ID (UUID)" })
  @IsUUID()
  token1Id: string;

  @ApiProperty({ description: "Token 1 address on the chain" })
  @IsString()
  @IsNotEmpty()
  token1Address: string;

  @ApiProperty({ description: "DEX ID (UUID)" })
  @IsUUID()
  dexId: string;

  @ApiPropertyOptional({ description: "Pool fee in basis points" })
  @IsNumber()
  @IsOptional()
  fee?: number;

  @ApiPropertyOptional({ description: "Additional metadata as JSON object" })
  @IsOptional()
  metadata?: Record<string, any>;
}
