# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Install**: `pnpm install` - Install dependencies (use pnpm, not npm)
- **Build**: `pnpm run build` - Compile TypeScript using NestJS CLI
- **Development**: `pnpm run dev` - Start development server with hot reload
- **Production**: `pnpm run start:prod` - Start production server
- **Testing**: 
  - `pnpm test` - Run Jest unit tests
  - `pnpm run test:watch` - Run tests in watch mode
  - `pnpm run test:cov` - Run tests with coverage
  - `pnpm run test:e2e` - Run end-to-end tests
- **Linting**: `pnpm run lint` - ESLint with auto-fix
- **Formatting**: `pnpm run format` - Prettier formatting

## Architecture Overview

This is a **NestJS-based arbitrage trading engine** ("arb-engine") that monitors multiple blockchain networks and executes trading strategies. The system is built around a modular architecture with the following key components:

### Core Modules Structure
```
src/
├── app.module.ts              # Main application module
├── main.ts                    # Application bootstrap
├── blockchain/                # Blockchain integration layer
│   ├── evm/                   # Ethereum Virtual Machine chains
│   │   ├── evm-listener/      # Real-time block monitoring via WebSocket
│   │   └── evm.module.ts      # EVM chain interactions
│   └── solana/                # Solana blockchain integration
│       ├── jito/              # Jito MEV integration
│       └── solana.module.ts   # Solana operations
├── strategies/                # Trading strategy implementations
│   └── dd/                    # Dex-to-Dex arbitrage strategy
├── dex-router/               # Decentralized exchange routing
├── settings/                 # Application configuration & state
├── entities/                 # TypeORM database entities
├── logger/                   # Custom logging system
└── shared/                   # Shared utilities and services
```

### Key Technologies & Dependencies
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM (entities: Order, TokenBalance, Initialize)
- **Message Queue**: Redis + Bull for job processing
- **Blockchain Libraries**: 
  - Ethereum/EVM: `viem`, `web3`
  - Solana: `@solana/web3.js`, `@project-serum/anchor`
- **API Documentation**: Swagger/OpenAPI (accessible at `/api`)
- **Package Manager**: pnpm (always use `pnpm`, never npm)

### Environment Configuration
Required environment variables (see `.env.example`):
```
# Database
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME

# Redis (for Bull queues)
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

# Blockchain RPCs
SOLANA_RPC_URL, JITO_RPC_URL
BASE_RPC_URL, ARBITRUM_RPC_URL, BSC_RPC_URL, MAINNET_RPC_URL

# External APIs
OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE

# Telegram notifications
TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, TELEGRAM_TOPIC_ID

# Server
PORT (default: 3200)
```

## Code Style Guidelines

### TypeScript Standards
- Always declare types for variables and functions (parameters and return values)
- Avoid using `any` - create necessary types instead
- Use JSDoc to document public classes and methods
- Don't leave blank lines within functions
- One export per file

### Naming Conventions
- **PascalCase**: Classes and interfaces
- **camelCase**: Variables, functions, and methods
- **kebab-case**: File and directory names
- **UPPERCASE**: Environment variables
- Start functions with verbs (e.g., `getUserData`, `validateInput`)
- Use verbs for booleans (e.g., `isLoading`, `hasError`, `canDelete`)
- Use complete words instead of abbreviations (except standard ones like API, URL)

### Functions & Methods
- Write short functions with single purpose (less than 20 instructions)
- Use early returns to avoid nesting
- Extract complex logic to utility functions
- Use arrow functions for simple operations (less than 3 instructions)
- Use default parameter values instead of null/undefined checks
- Use objects for multiple parameters (RO-RO pattern)
- Declare types for input arguments and output

### Classes & Architecture
- Follow SOLID principles
- Prefer composition over inheritance
- Write small classes with single purpose (less than 200 instructions, less than 10 public methods)
- Use interfaces to define contracts
- Prefer immutability for data
- Use `readonly` for data that doesn't change
- Use `as const` for literals

### NestJS Specific Patterns
- Use modular architecture - one module per main domain/route
- One controller per route, additional controllers for secondary routes
- DTOs validated with class-validator for inputs
- One service per entity
- Use dependency injection throughout
- Global filters for exception handling
- Guards for permission management
- Interceptors for request management

### Error Handling
- Use exceptions for unexpected errors
- Catch exceptions only to fix expected problems or add context
- Otherwise use global error handlers
- Provide meaningful error messages

### Data Validation
- Don't abuse primitive types - encapsulate data in composite types
- Avoid data validation in functions - use classes with internal validation
- Use DTOs with class-validator for API inputs

## EVM Listener System
The application includes a sophisticated EVM block listener documented in `EVM_LISTENER_IMPLEMENTATION.md` that:
- Monitors multiple EVM chains via WebSocket connections
- Publishes block events to Redis message queues
- Provides RESTful API for dynamic chain management (`/evm-listener/*`)
- Supports automatic reconnection and comprehensive error handling

## Testing
- Jest configuration in `package.json`
- Unit tests alongside source files (`.spec.ts`)
- E2E tests in `/tests` directory
- EVM listener has comprehensive test coverage (42 tests)