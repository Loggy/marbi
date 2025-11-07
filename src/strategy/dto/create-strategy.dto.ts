import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for creating a new Strategy
 */
export class CreateStrategyDto {
  @ApiProperty({ description: "Strategy type (e.g., 'dex-to-dex', 'cross-chain')" })
  @IsString()
  @IsNotEmpty()
  type: string;
}
