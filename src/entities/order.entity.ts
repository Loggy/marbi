import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  params: any;

  @Column()
  status: string;

  @Column({ nullable: true })
  txHash: string;

  @Column('jsonb', { nullable: true })
  result: any;

  @CreateDateColumn()
  createdAt: Date;
} 