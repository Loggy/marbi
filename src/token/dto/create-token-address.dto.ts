import { IsString, IsNotEmpty, IsNumber, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating a new TokenAddress
 */
export class CreateTokenAddressDto {
  @ApiProperty({ description: "Contract address on the blockchain" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: "Blockchain chain ID" })
  @IsNumber()
  chainId: number;

  @ApiPropertyOptional({ description: "Number of decimals for the token" })
  @IsNumber()
  @IsOptional()
  decimals?: number;
}
