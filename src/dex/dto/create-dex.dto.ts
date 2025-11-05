import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating a new DEX
 */
export class CreateDexDto {
  @ApiProperty({ description: "Unique name of the DEX" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Event topic hash for swap events" })
  @IsString()
  @IsNotEmpty()
  swapTopic: string;

  @ApiPropertyOptional({ description: "Event topic hash for add liquidity events" })
  @IsString()
  @IsOptional()
  addLiquidityTopic?: string;

  @ApiPropertyOptional({ description: "Event topic hash for remove liquidity events" })
  @IsString()
  @IsOptional()
  removeLiquidityTopic?: string;
}
