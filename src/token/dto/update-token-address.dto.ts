import { PartialType } from "@nestjs/swagger";
import { CreateTokenAddressDto } from "./create-token-address.dto";

/**
 * DTO for updating a TokenAddress
 * All fields from CreateTokenAddressDto are optional
 */
export class UpdateTokenAddressDto extends PartialType(CreateTokenAddressDto) {}
