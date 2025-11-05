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

/**
 * TokenAddress entity maps specific blockchain addresses to canonical tokens.
 * This allows tracking the same token across multiple chains with different addresses.
 * Example: USDC has different addresses on Ethereum (chainId: 1), BSC (chainId: 56), etc.
 */
@Entity("token_addresses")
@Index(["address", "chainId"], { unique: true })
export class TokenAddress {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  address: string;

  @Column()
  chainId: number;

  @ManyToOne(() => Token, (token) => token.addresses, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "tokenId" })
  token: Token;

  @Column()
  tokenId: string;

  @Column({ nullable: true })
  decimals: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
