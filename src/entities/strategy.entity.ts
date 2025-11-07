import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Pool } from "./pool.entity";

/**
 * Strategy entity represents a trading strategy configuration.
 * Each strategy can be associated with multiple pools.
 */
@Entity("strategies")
export class Strategy {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  type: string;

  @OneToMany(() => Pool, (pool) => pool.strategy)
  pools: Pool[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
