import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order } from "../../order/order.entity";
import { EVMService } from "../../blockchain/evm/evm.service";
import { SolanaService } from "../../blockchain/solana/solana.service";
import { DexRouterService } from "../../dex-router/dex-router.service";
import { LoggerService } from "../../logger/logger.service";
import { TokenBalance } from "../../blockchain/solana/solana.service";

@Injectable()
export class DDService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private evmService: EVMService,
    private solanaService: SolanaService,
    private dexRouterService: DexRouterService,
    private logger: LoggerService
  ) {}

  async createOrder(params: any): Promise<Order> {
    const order = this.orderRepository.create({
      params,
      status: "PENDING",
    });

    await this.logger.log(
      `Creating new order with params: ${JSON.stringify(params)}`
    );
    return await this.orderRepository.save(order);
  }
}
