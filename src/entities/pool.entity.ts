import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Token } from "./token.entity";
import { Dex } from "./dex.entity";
import { Strategy } from "./strategy.entity";

/**
 * Pool entity represents a DEX liquidity pool containing a token pair.
 * Pools are chain-specific, but link to canonical tokens for cross-chain querying.
 */
@Entity("pools")
@Index(["poolAddress", "chainId"], { unique: true })
@Index(["chainId", "token0Id"])
@Index(["chainId", "token1Id"])
@Index(["token0Id", "token1Id"])
export class Pool {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  poolAddress: string;

  @Column()
  chainId: number;

  @ManyToOne(() => Token, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "token0Id" })
  token0: Token;

  @Column()
  token0Id: string;

  @Column()
  token0Address: string;

  @ManyToOne(() => Token, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "token1Id" })
  token1: Token;

  @Column()
  token1Id: string;

  @Column()
  token1Address: string;

  @ManyToOne(() => Dex, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dexId" })
  dex: Dex;

  @Column()
  dexId: string;

  @ManyToOne(() => Strategy, (strategy) => strategy.pools, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "strategyId" })
  strategy: Strategy;

  @Column({ nullable: true })
  strategyId: string;

  @Column({ nullable: true })
  fee: number;

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
