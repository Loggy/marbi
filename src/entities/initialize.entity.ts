import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";
import { InitializeDto } from "../settings/dto/initialize.dto";

@Entity("initializes")
export class Initialize {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("jsonb")
  params: InitializeDto;

  @CreateDateColumn()
  createdAt: Date;
}
