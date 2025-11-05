import { PartialType } from "@nestjs/swagger";
import { CreateDexDto } from "./create-dex.dto";

/**
 * DTO for updating an existing DEX
 * All fields from CreateDexDto are optional
 */
export class UpdateDexDto extends PartialType(CreateDexDto) {}
