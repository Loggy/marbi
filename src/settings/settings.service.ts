import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TokenBalance } from "../entities/token-balance.entity";
import { EVMService } from "../blockchain/evm/evm.service";
import { SolanaService } from "../blockchain/solana/solana.service";
import {
  EVMChain,
  InitializeDto,
  TokenInitResult,
  ChainInitResult,
  EVMInitResult,
  SolanaInitResult,
  SolanaTokenInitResult,
  SolanaToken,
} from "./dto/initialize.dto";
import { Initialize } from "src/entities/initialize.entity";
import { AppStateService } from "./app-state.service";
import { LoggerService } from "../logger/logger.service";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(TokenBalance)
    private tokenBalanceRepository: Repository<TokenBalance>,
    @InjectRepository(Initialize)
    private initializeRepository: Repository<Initialize>,

    private evmService: EVMService,
    private solanaService: SolanaService,
    private appStateService: AppStateService,
    private logger: LoggerService
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
    const initialize = await this.initializeRepository.create({
      params,
    });
    await this.initializeRepository.save(initialize);
  }

  async initialize(params: InitializeDto) {
    const results = {
      evm: null as EVMInitResult | null,
      solana: null as SolanaInitResult | null,
    };

    if (params.evmSettings) {
      const chainResults: ChainInitResult[] = [];
      let hasErrors = false;

      for (const chain of params.evmSettings.chains) {
        const chainResult = await this.initializeEVMChain(
          params.evmSettings.privateKey,
          params.evmSettings.walletAddress,
          chain
        );
        chainResults.push(chainResult);
        if (!chainResult.success) {
          hasErrors = true;
        }
      }

      results.evm = {
        chains: chainResults,
        success: !hasErrors,
        error: hasErrors
          ? "One or more chains failed to initialize"
          : undefined,
      };
    }

    if (params.solanaSettings) {
      results.solana = await this.initializeSolana(
        params.solanaSettings.privateKey,
        params.solanaSettings.walletAddress
      );
    }

    // Only set as initialized if everything succeeded
    const isSuccessful =
      (!results.evm || results.evm.success) &&
      (!results.solana || results.solana?.success);
    this.appStateService.setInitialized(isSuccessful);

    await this.logger.log(
      isSuccessful
        ? "App initialization succeeded"
        : `App initialization failed. Details: ${JSON.stringify(
            {
              evmSuccess: results.evm?.success ?? "not configured",
              solanaSuccess: results.solana?.success ?? "not configured",
              evmErrors: results.evm?.error,
              solanaErrors: results.solana?.error,
              chainErrors: results.evm?.chains
                ?.filter((chain) => !chain.success)
                .map((chain) => ({
                  chainId: chain.chainId,
                  error: chain.error,
                  failedTokens: chain.tokens
                    .filter((token) => !token.success)
                    .map((token) => ({
                      address: token.tokenAddress,
                      error: token.error,
                    })),
                })),
              solanaFailedTokens: results.solana?.tokens
                .filter((token) => !token.success)
                .map((token) => ({
                  address: token.tokenAddress,
                  error: token.error,
                })),
            },
            null,
            2
          )}`,
      isSuccessful ? "info" : "error"
    );

    return results;
  }

  async initializeSolana(
    privateKey: string,
    address: string
  ): Promise<SolanaInitResult> {
    try {
      const tokenResults: SolanaTokenInitResult[] = [];
      const walletBalances = await this.solanaService.getWalletBalances(
        address
      );

      for (const token of walletBalances.tokens) {
        try {
          const newToken = new TokenBalance();
          newToken.address = token.address;
          newToken.chainId = "101";
          newToken.balance = token.balance;
          newToken.decimals = token.decimals;

          try {
            await this.updateTokenBalance(newToken);
            tokenResults.push({
              tokenAddress: token.address,
              balance: token.balance,
              decimals: token.decimals,
              success: true,
            });
          } catch (error) {
            tokenResults.push({
              tokenAddress: token.address,
              balance: token.balance,
              decimals: token.decimals,
              success: false,
              error: `Failed to update token balance: ${error.message}`,
            });
          }
        } catch (error) {
          tokenResults.push({
            tokenAddress: token.address,
            balance: "0",
            decimals: 0,
            success: false,
            error: `Failed to process token: ${error.message}`,
          });
        }
      }

      const hasErrors = tokenResults.some((token) => !token.success);
      return {
        tokens: tokenResults,
        success: !hasErrors,
        error: hasErrors
          ? "One or more Solana tokens failed to initialize"
          : undefined,
      };
    } catch (error) {
      this.logger.log(
        `Solana initialization failed: ${error.message}`,
        "error"
      );
      return {
        tokens: [],
        success: false,
        error: `Solana initialization failed: ${error.message}`,
      };
    }
  }

  async initializeEVMChain(
    privateKey: string,
    address: string,
    chain: EVMChain
  ): Promise<ChainInitResult> {
    try {
      const tokenResults: TokenInitResult[] = [];
      const tokenInfos = await this.evmService.getTokensInfo(
        address,
        chain.chainId,
        chain.tokens.map((token) => token.tokenAddress)
      );

      for (const token of chain.tokens) {
        try {
          const tokenInfo = tokenInfos.find(
            (info) => info.tokenAddress === token.tokenAddress
          );

          if (!tokenInfo) {
            tokenResults.push({
              tokenAddress: token.tokenAddress,
              balance: "0",
              allowance: "0",
              minAllowance: token.min_allowance.toString(),
              success: false,
              error: "Failed to fetch token info",
            });
            continue;
          }

          let allowanceUpdated = false;
          if (tokenInfo.allowance < BigInt(token.min_allowance)) {
            try {
              const hash = await this.evmService.setAllowance(
                chain.chainId,
                token.tokenAddress,
                BigInt(token.set_allowance),
                privateKey
              );
              if (!hash) {
                throw new Error("No hash from setAllowance");
              }
              tokenInfo.allowance = BigInt(token.set_allowance);
              allowanceUpdated = true;
              this.logger.log(`Updated allowance for ${token.tokenAddress}`, 'info');
            } catch (error) {
              tokenResults.push({
                tokenAddress: token.tokenAddress,
                balance: tokenInfo.balance.toString(),
                allowance: tokenInfo.allowance.toString(),
                minAllowance: token.min_allowance.toString(),
                success: false,
                error: `Failed to update allowance: ${error.message}`,
                allowanceUpdated: false,
              });
              continue;
            }
          }

          const newToken = new TokenBalance();
          newToken.address = token.tokenAddress;
          newToken.chainId = chain.chainId.toString();
          newToken.balance = tokenInfo.balance.toString();
          newToken.currentAllowance = tokenInfo.allowance.toString();
          newToken.minAllowance = token.min_allowance.toString();

          try {
            await this.updateTokenBalance(newToken);
            tokenResults.push({
              tokenAddress: token.tokenAddress,
              balance: tokenInfo.balance.toString(),
              allowance: tokenInfo.allowance.toString(),
              minAllowance: token.min_allowance.toString(),
              success: true,
              allowanceUpdated,
            });
          } catch (error) {
            tokenResults.push({
              tokenAddress: token.tokenAddress,
              balance: tokenInfo.balance.toString(),
              allowance: tokenInfo.allowance.toString(),
              minAllowance: token.min_allowance.toString(),
              success: false,
              error: `Failed to update token balance: ${error.message}`,
              allowanceUpdated,
            });
          }
        } catch (error) {
          tokenResults.push({
            tokenAddress: token.tokenAddress,
            balance: "0",
            allowance: "0",
            minAllowance: token.min_allowance.toString(),
            success: false,
            error: `Token initialization failed: ${error.message}`,
          });
        }
      }

      const hasErrors = tokenResults.some((token) => !token.success);
      return {
        chainId: chain.chainId,
        tokens: tokenResults,
        success: !hasErrors,
        error: hasErrors
          ? "One or more tokens failed to initialize"
          : undefined,
      };
    } catch (error) {
      return {
        chainId: chain.chainId,
        tokens: [],
        success: false,
        error: `Chain initialization failed: ${error.message}`,
      };
    }
  }
}
