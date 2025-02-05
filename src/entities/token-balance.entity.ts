import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("token_balances")
export class TokenBalance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  address: string;

  @Column()
  chainId: string;

  @Column("numeric", { precision: 78, scale: 0, default: "0" })
  balance?: string;

  @Column("numeric", { precision: 78, scale: 0, default: "0" })
  currentAllowance?: string;

  @Column("numeric", { precision: 78, scale: 0, default: "0" })
  minAllowance?: string;

  @Column()
  decimals?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
