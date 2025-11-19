# Arb Engine Dashboard

A modern web interface for managing the arbitrage trading engine built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **RPC Management**: Configure and monitor EVM blockchain RPC connections
- **DEX Management**: Add and manage decentralized exchanges with event topics
- **Token Management**: Track tokens and their addresses across multiple chains
- **Pool Management**: Configure liquidity pools with token pairs and DEX assignments
- **Strategy Management**: Create trading strategies and assign pools

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Arb Engine backend running at `http://localhost:3000` (or configure via `.env.local`)

### Installation

```bash
# Install dependencies
pnpm install
```

### Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development

```bash
# Start development server with Turbopack
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
ui/
├── app/                      # Next.js app router pages
│   ├── page.tsx             # Dashboard home
│   ├── rpcs/                # RPC management
│   ├── dexes/               # DEX management
│   ├── tokens/              # Token management
│   ├── pools/               # Pool management
│   ├── strategies/          # Strategy management
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── navigation.tsx       # Navigation bar
│   ├── rpcs/               # RPC-related components
│   ├── dexes/              # DEX-related components
│   ├── tokens/             # Token-related components
│   ├── pools/              # Pool-related components
│   └── strategies/         # Strategy-related components
├── lib/                     # Utilities and API client
│   ├── api.ts              # API client functions
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Helper functions
└── public/                  # Static assets
```

## API Integration

The dashboard communicates with the Arb Engine backend REST API:

- **RPCs**: `/evm-listener/*` - Manage EVM chain RPC connections
- **DEXes**: `/dexes/*` - CRUD operations for DEXes
- **Tokens**: `/tokens/*` - CRUD operations for tokens and addresses
- **Pools**: `/pools/*` - CRUD operations for liquidity pools
- **Strategies**: `/strategies/*` - CRUD operations for strategies and pool assignments

All API calls are handled through the centralized API client in `lib/api.ts`.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Features Detail

### RPC Management
- Add/remove EVM chain RPC endpoints (WebSocket)
- Monitor chain status, block numbers, and latency
- Restart individual chains or stop all monitoring

### DEX Management
- Configure DEX names and event topics
- Swap, add liquidity, and remove liquidity event signatures
- Edit and delete existing DEXes

### Token Management
- Create canonical tokens with symbols and names
- Add multiple addresses for the same token across different chains
- Track token decimals per chain
- View all token addresses in one place

### Pool Management
- Configure liquidity pools with token pairs
- Assign pools to specific DEXes
- Track pool addresses and fees
- Cross-chain pool support

### Strategy Management
- Create trading strategies by type
- Assign multiple pools to strategies
- View strategy pools and manage assignments
- Visual pool management interface

## UI Components

The dashboard uses shadcn/ui components for a consistent, accessible interface:

- Cards for content organization
- Dialogs for forms and actions
- Badges for status indicators
- Tables and lists for data display
- Alerts for error and success messages
- Responsive design for mobile and desktop

## Development Notes

- All forms include validation and error handling
- API errors are displayed to users with clear messages
- Loading states are shown during API calls
- Confirmation dialogs prevent accidental deletions
- Data is refetched after mutations to stay in sync
- Responsive design works on mobile, tablet, and desktop

## Chain Support

The UI includes friendly names for common chains:

- Ethereum (1)
- BSC (56)
- Polygon (137)
- Base (8453)
- Arbitrum (42161)
- Optimism (10)

Additional chains display as "Chain {chainId}".

## License

Part of the Arb Engine project.
