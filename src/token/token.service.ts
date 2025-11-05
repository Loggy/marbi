import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Token } from "../entities/token.entity";
import { TokenAddress } from "../entities/token-address.entity";
import { CreateTokenDto } from "./dto/create-token.dto";
import { UpdateTokenDto } from "./dto/update-token.dto";
import { CreateTokenAddressDto } from "./dto/create-token-address.dto";
import { UpdateTokenAddressDto } from "./dto/update-token-address.dto";

/**
 * Service handling Token and TokenAddress CRUD operations
 */
@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(TokenAddress)
    private readonly tokenAddressRepository: Repository<TokenAddress>,
  ) {}

  /**
   * Create a new Token with optional addresses
   * @param createTokenDto - Data for creating a Token
   * @returns Created Token entity with addresses
   */
  async create(createTokenDto: CreateTokenDto): Promise<Token> {
    const token = this.tokenRepository.create({
      symbol: createTokenDto.symbol,
      name: createTokenDto.name,
      description: createTokenDto.description,
    });
    if (createTokenDto.addresses && createTokenDto.addresses.length > 0) {
      const addresses = createTokenDto.addresses.map((addrDto) =>
        this.tokenAddressRepository.create({
          address: addrDto.address,
          chainId: addrDto.chainId,
          decimals: addrDto.decimals,
        }),
      );
      token.addresses = addresses;
    }
    return this.tokenRepository.save(token);
  }

  /**
   * Get all Tokens with their addresses
   * @returns Array of all Token entities with addresses
   */
  async findAll(): Promise<Token[]> {
    return this.tokenRepository.find({
      relations: ["addresses"],
      order: { symbol: "ASC" },
    });
  }

  /**
   * Get a Token by ID with its addresses
   * @param id - Token UUID
   * @returns Token entity with addresses
   * @throws NotFoundException if Token not found
   */
  async findOne(id: string): Promise<Token> {
    const token = await this.tokenRepository.findOne({
      where: { id },
      relations: ["addresses"],
    });
    if (!token) {
      throw new NotFoundException(`Token with ID '${id}' not found`);
    }
    return token;
  }

  /**
   * Update a Token
   * @param id - Token UUID
   * @param updateTokenDto - Data to update
   * @returns Updated Token entity with addresses
   * @throws NotFoundException if Token not found
   */
  async update(id: string, updateTokenDto: UpdateTokenDto): Promise<Token> {
    const token = await this.findOne(id);
    Object.assign(token, updateTokenDto);
    return this.tokenRepository.save(token);
  }

  /**
   * Delete a Token (cascades to TokenAddresses)
   * @param id - Token UUID
   * @throws NotFoundException if Token not found
   */
  async remove(id: string): Promise<void> {
    const token = await this.findOne(id);
    await this.tokenRepository.remove(token);
  }

  /**
   * Add a TokenAddress to a Token
   * @param tokenId - Token UUID
   * @param createTokenAddressDto - TokenAddress data
   * @returns Created TokenAddress entity
   * @throws NotFoundException if Token not found
   * @throws ConflictException if address already exists on that chain
   */
  async addAddress(
    tokenId: string,
    createTokenAddressDto: CreateTokenAddressDto,
  ): Promise<TokenAddress> {
    const token = await this.findOne(tokenId);
    const existingAddress = await this.tokenAddressRepository.findOne({
      where: {
        address: createTokenAddressDto.address,
        chainId: createTokenAddressDto.chainId,
      },
    });
    if (existingAddress) {
      throw new ConflictException(
        `Address '${createTokenAddressDto.address}' on chain ${createTokenAddressDto.chainId} already exists`,
      );
    }
    const tokenAddress = this.tokenAddressRepository.create({
      ...createTokenAddressDto,
      tokenId: token.id,
    });
    return this.tokenAddressRepository.save(tokenAddress);
  }

  /**
   * Update a TokenAddress
   * @param tokenId - Token UUID
   * @param addressId - TokenAddress UUID
   * @param updateTokenAddressDto - Data to update
   * @returns Updated TokenAddress entity
   * @throws NotFoundException if Token or TokenAddress not found
   * @throws ConflictException if updating to existing address/chain combination
   */
  async updateAddress(
    tokenId: string,
    addressId: string,
    updateTokenAddressDto: UpdateTokenAddressDto,
  ): Promise<TokenAddress> {
    await this.findOne(tokenId);
    const tokenAddress = await this.tokenAddressRepository.findOne({
      where: { id: addressId, tokenId },
    });
    if (!tokenAddress) {
      throw new NotFoundException(
        `TokenAddress with ID '${addressId}' not found for token '${tokenId}'`,
      );
    }
    if (
      updateTokenAddressDto.address &&
      updateTokenAddressDto.chainId &&
      (updateTokenAddressDto.address !== tokenAddress.address ||
        updateTokenAddressDto.chainId !== tokenAddress.chainId)
    ) {
      const existingAddress = await this.tokenAddressRepository.findOne({
        where: {
          address: updateTokenAddressDto.address,
          chainId: updateTokenAddressDto.chainId,
        },
      });
      if (existingAddress && existingAddress.id !== addressId) {
        throw new ConflictException(
          `Address '${updateTokenAddressDto.address}' on chain ${updateTokenAddressDto.chainId} already exists`,
        );
      }
    }
    Object.assign(tokenAddress, updateTokenAddressDto);
    return this.tokenAddressRepository.save(tokenAddress);
  }

  /**
   * Delete a TokenAddress
   * @param tokenId - Token UUID
   * @param addressId - TokenAddress UUID
   * @throws NotFoundException if Token or TokenAddress not found
   */
  async removeAddress(tokenId: string, addressId: string): Promise<void> {
    await this.findOne(tokenId);
    const tokenAddress = await this.tokenAddressRepository.findOne({
      where: { id: addressId, tokenId },
    });
    if (!tokenAddress) {
      throw new NotFoundException(
        `TokenAddress with ID '${addressId}' not found for token '${tokenId}'`,
      );
    }
    await this.tokenAddressRepository.remove(tokenAddress);
  }
}
