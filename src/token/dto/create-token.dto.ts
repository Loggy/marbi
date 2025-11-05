import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsArray } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateTokenAddressDto } from "./create-token-address.dto";

/**
 * DTO for creating a new Token
 */
export class CreateTokenDto {
  @ApiProperty({ description: "Token symbol (e.g., USDC, WETH)" })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({ description: "Full token name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Token description" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Array of token addresses across different chains",
    type: [CreateTokenAddressDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTokenAddressDto)
  @IsOptional()
  addresses?: CreateTokenAddressDto[];
}
