import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import { Address } from "viem";

export class EVMToken {
  @IsString()
  @IsNotEmpty()
  tokenAddress: Address;

  @IsNumber()
  @IsNotEmpty()
  minAllowance: number;

  @IsNumber()
  @IsNotEmpty()
  setAllowance: number;
}

export class EVMChain {
  @IsNumber()
  @IsNotEmpty()
  chainId: number;

  @ValidateNested({ each: true })
  @Type(() => EVMToken)
  @IsArray()
  tokens: EVMToken[];
}

export class EVMSettings {
  @IsString()
  @IsNotEmpty()
  walletAddress: Address;

  @ValidateNested({ each: true })
  @Type(() => EVMChain)
  @IsArray()
  chains: EVMChain[];
}

export class SolanaToken {
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;
}

export class SolanaSettings {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ValidateNested({ each: true })
  @Type(() => SolanaToken)
  @IsArray()
  tokens: SolanaToken[];
}

export class InitializeDto {
  @ValidateNested()
  @Type(() => EVMSettings)
  @IsOptional()
  evmSettings?: EVMSettings;

  @ValidateNested()
  @Type(() => SolanaSettings)
  @IsOptional()
  solanaSettings?: SolanaSettings;
} 

export class EVMTokenInfo {
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @IsNumber()
  @IsNotEmpty()
  balance: bigint;

  @IsNumber()
  @IsNotEmpty()
  allowance: bigint;
}
