import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * DEX entity represents a decentralized exchange with its identifying event topics.
 * Each DEX has a unique name and associated event signatures for tracking swaps and liquidity changes.
 */
@Entity("dexes")
@Index(["name"], { unique: true })
export class Dex {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  swapTopic: string;

  @Column({ nullable: true })
  addLiquidityTopic: string;

  @Column({ nullable: true })
  removeLiquidityTopic: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
