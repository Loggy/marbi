import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TokenBalance } from "../entities/token-balance.entity";
import { EVMService } from "../blockchain/evm/evm.service";
import { SolanaService } from "../blockchain/solana/solana.service";
import { EVMChain, InitializeDto } from "./dto/initialize.dto";
import { all } from "axios";
import { Address } from "viem";
import { Initialize } from "src/entities/initialize.entity";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(TokenBalance)
    private tokenBalanceRepository: Repository<TokenBalance>,
    @InjectRepository(Initialize)
    private initializeRepository: Repository<Initialize>,

    private evmService: EVMService,
    private solanaService: SolanaService
  ) {}

  async updateTokenBalance(
    token: Partial<TokenBalance>
  ): Promise<TokenBalance> {
    if (token.chainId === "101") {
      token.decimals =
        token.decimals ||
        (await this.solanaService.getTokenInfo(token.address)).decimals;
      token.balance = token.balance
        ? token.balance
        : await this.solanaService
            .getTokenBalance(token.address, process.env.SOLANA_WALLET_ADDRESS)
            .toString();
    } else {
      token.balance = token.balance
        ? token.balance
        : await this.evmService
            .getTokenBalance(
              token.address,
              process.env.EVM_WALLET_ADDRESS,
              parseInt(token.chainId)
            )
            .toString();
      token.decimals =
        token.decimals ||
        (await this.evmService.getTokenDecimals(
          token.address,
          parseInt(token.chainId)
        ));
    }

    let existingBalance = await this.tokenBalanceRepository.findOne({
      where: { address: token.address, chainId: token.chainId },
    });

    if (existingBalance) {
      existingBalance = { ...existingBalance, ...token };
      return await this.tokenBalanceRepository.save(existingBalance);
    } else {
      const newBalance = this.tokenBalanceRepository.create(token);
      return await this.tokenBalanceRepository.save(newBalance);
    }
  }

  async saveInitialize(params: InitializeDto) {
    const initialize = this.initializeRepository.create({
      params,
    });
    await this.initializeRepository.save(initialize);
  }

  async initialize(params: InitializeDto) {
    const results = {
      evm: null,
      solana: null,
    };

    if (params.evmSettings) {
      results.evm = {};
      for (const chain of params.evmSettings.chains) {
        results.evm[chain.chainId] = await this.initializeEVMChain(
          params.evmSettings.walletAddress,
          chain
        );
      }
    }

    if (params.solanaSettings) {
      results.solana = await this.initializeSolana(
        params.solanaSettings.walletAddress
      );
    }

    return results;
  }

  async initializeSolana(walletAddress: string) {
    try {
      return await this.solanaService.getWalletBalances(walletAddress);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async initializeEVMChain(walletAddress: string, chain: EVMChain) {
    try {
      const tokenInfos = await this.evmService.getTokensInfo(
        walletAddress,
        chain.chainId,
        chain.tokens.map((token) => token.tokenAddress)
      );
      for (const token of chain.tokens) {
        const newToken = new TokenBalance();
        const tokenInfo = tokenInfos.find(
          (info) => info.tokenAddress === token.tokenAddress
        );
        if (tokenInfo && tokenInfo.allowance < token.minAllowance) {
          await this.evmService.setAllowance(
            chain.chainId,
            token.tokenAddress,
            BigInt(token.setAllowance)
          );
          tokenInfo.allowance = BigInt(token.setAllowance);
        }
        newToken.address = token.tokenAddress;
        newToken.chainId = chain.chainId.toString();
        newToken.balance = tokenInfo.balance.toString();
        newToken.currentAllowance = tokenInfo.allowance.toString();
        newToken.minAllowance = token.minAllowance.toString();
        await this.updateTokenBalance(newToken);
      }
      return chain.tokens;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}
