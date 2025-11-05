import { PartialType } from "@nestjs/swagger";
import { CreatePoolDto } from "./create-pool.dto";

/**
 * DTO for updating a Pool
 * All fields from CreatePoolDto are optional
 */
export class UpdatePoolDto extends PartialType(CreatePoolDto) {}
