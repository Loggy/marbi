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
import { Wallet } from "src/strategies/dd/dto/create-order.dto";

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
  @IsNotEmpty()
  chainId: string;

  @ValidateNested({ each: true })
  @Type(() => EVMToken)
  @IsArray()
  tokens: EVMToken[];
}

export class EVMSettings {
  @ValidateNested()
  @Type(() => Wallet)
  @IsNotEmpty()
  wallet: Wallet;

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
  wallet: Wallet;

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
