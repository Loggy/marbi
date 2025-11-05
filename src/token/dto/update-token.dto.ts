import { PartialType } from "@nestjs/swagger";
import { CreateTokenDto } from "./create-token.dto";

/**
 * DTO for updating a Token
 * All fields from CreateTokenDto are optional
 * Note: addresses are not updated through this DTO, use separate endpoints
 */
export class UpdateTokenDto extends PartialType(CreateTokenDto) {}
