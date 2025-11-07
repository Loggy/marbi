import { PartialType } from "@nestjs/swagger";
import { CreateStrategyDto } from "./create-strategy.dto";

/**
 * DTO for updating a Strategy
 * All fields from CreateStrategyDto are optional
 */
export class UpdateStrategyDto extends PartialType(CreateStrategyDto) {}
