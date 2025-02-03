import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('token_balances')
export class TokenBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  address: string;

  @Column()
  chainId: string;

  @Column("bigint", { default: "0" })
  balance?: string;

  @Column("bigint", { default: "0" })
  currentAllowance?: string;

  @Column("bigint", { default: "0" })
  minAllowance?: string;

  @Column()
  decimals?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
