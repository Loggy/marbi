import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { DDService } from "./dd.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Controller("dd")
export class DDController {
  constructor(private readonly ddService: DDService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createOrder(@Body() params: CreateOrderDto) {
    const to = params.spread_entry.to_network_name;

    const toNetwork =
      params.config.Network0.NetworkName === to
        ? params.config.Network0
        : params.config.Network1;

    const toStartTokenAddress = toNetwork.StartTokenAddress;
    const toStartTokenDecimals = toNetwork.StartTokenDecimals
    
    toNetwork.StartTokenAddress = toNetwork.FinishTokenAddress;
    toNetwork.StartTokenDecimals = toNetwork.FinishTokenDecimals;

    toNetwork.FinishTokenAddress = toStartTokenAddress;
    toNetwork.FinishTokenDecimals = toStartTokenDecimals;

    return await this.ddService.createOrder(params);
  }
}
