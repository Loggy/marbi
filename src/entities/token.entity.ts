import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { TokenAddress } from "./token-address.entity";

/**
 * Token entity represents a canonical token across multiple blockchain networks.
 * This serves as the single source of truth for a token concept (e.g., USDC, WETH).
 * The same canonical token can have different addresses on different chains,
 * which are tracked via the TokenAddress entity.
 */
@Entity("tokens")
export class Token {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  symbol: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => TokenAddress, (tokenAddress) => tokenAddress.token, {
    cascade: true,
  })
  addresses: TokenAddress[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  stable?: boolean;
}
