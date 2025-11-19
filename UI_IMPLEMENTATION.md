# Arb Engine UI Implementation

This document describes the UI implementation for the Arb Engine arbitrage trading platform.

## Overview

A modern, responsive web dashboard built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui that provides a complete management interface for the arbitrage trading engine.

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Project Location

The UI is located in the `ui/` directory at the root of the arb-engine project.

## Features Implemented

### 1. Dashboard (Home Page)
- Overview cards for all management sections
- Quick navigation to each feature
- Clean, modern interface

### 2. RPC Management (`/rpcs`)
**Functionality**:
- View all configured EVM chain RPC connections
- Real-time status monitoring for each chain
- Add new chain RPC endpoints (WebSocket only)
- Remove existing chains
- Restart individual chains
- Stop all chains at once
- Display metrics: block number, latency, error count

**API Endpoints Used**:
- `GET /evm-listener/status` - Get overall status
- `POST /evm-listener/chain` - Add new chain
- `DELETE /evm-listener/chain/:chainId` - Remove chain
- `POST /evm-listener/chain/:chainId/restart` - Restart chain
- `POST /evm-listener/stop-all` - Stop all chains

### 3. DEX Management (`/dexes`)
**Functionality**:
- List all configured DEXes
- Add new DEX with event topics
- Edit existing DEX configuration
- Delete DEXes
- View swap, add liquidity, and remove liquidity topics

**API Endpoints Used**:
- `GET /dexes` - Get all DEXes
- `POST /dexes` - Create DEX
- `PUT /dexes/:id` - Update DEX
- `DELETE /dexes/:id` - Delete DEX

**Fields**:
- Name (required, unique)
- Swap Topic (required)
- Add Liquidity Topic (optional)
- Remove Liquidity Topic (optional)

### 4. Token Management (`/tokens`)
**Functionality**:
- List all tokens with their addresses
- Add new tokens with cross-chain addresses
- Edit token information
- Delete tokens
- View token addresses across multiple chains
- Track token decimals per chain

**API Endpoints Used**:
- `GET /tokens` - Get all tokens with addresses
- `POST /tokens` - Create token
- `PUT /tokens/:id` - Update token
- `DELETE /tokens/:id` - Delete token

**Fields**:
- Symbol (required)
- Name (required)
- Description (optional)
- Addresses (array):
  - Address (required)
  - Chain ID (required)
  - Decimals (optional)

**Chain Support**:
- Ethereum (1)
- BSC (56)
- Polygon (137)
- Base (8453)
- Arbitrum (42161)
- Optimism (10)
- Custom chains displayed as "Chain {chainId}"

### 5. Pool Management (`/pools`)
**Functionality**:
- List all configured liquidity pools
- Add new pools with token pairs
- Edit pool configuration
- Delete pools
- View pool details: tokens, DEX, fee, strategy
- Cross-chain pool support

**API Endpoints Used**:
- `GET /pools` - Get all pools with relations
- `POST /pools` - Create pool
- `PUT /pools/:id` - Update pool
- `DELETE /pools/:id` - Delete pool
- `GET /dexes` - For DEX selection
- `GET /tokens` - For token selection

**Fields**:
- Pool Address (required)
- Chain ID (required)
- Token 0 ID (required, UUID)
- Token 0 Address (required)
- Token 1 ID (required, UUID)
- Token 1 Address (required)
- DEX (required, selection)
- Fee in basis points (optional)

### 6. Strategy Management (`/strategies`)
**Functionality**:
- List all trading strategies
- Add new strategies
- Edit strategy type
- Delete strategies
- View assigned pools
- Manage pool assignments with visual interface
- Add/remove pools from strategies

**API Endpoints Used**:
- `GET /strategies` - Get all strategies with pools
- `POST /strategies` - Create strategy
- `PUT /strategies/:id` - Update strategy
- `DELETE /strategies/:id` - Delete strategy
- `POST /strategies/:id/pools/:poolId` - Add pool to strategy
- `DELETE /strategies/:id/pools/:poolId` - Remove pool from strategy
- `GET /pools` - For pool selection

**Fields**:
- Type (required) - e.g., "dex-to-dex", "cross-chain"

**Pool Assignment**:
- Two-column interface: Assigned vs Available pools
- Click to add/remove pools
- Visual feedback for assignments
- Pools can only be assigned to one strategy

## Component Structure

```
ui/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                 # Dashboard home
│   ├── layout.tsx               # Root layout with navigation
│   ├── globals.css              # Global styles
│   ├── rpcs/page.tsx           # RPC management
│   ├── dexes/page.tsx          # DEX management
│   ├── tokens/page.tsx         # Token management
│   ├── pools/page.tsx          # Pool management
│   └── strategies/page.tsx     # Strategy management
│
├── components/
│   ├── ui/                      # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── badge.tsx
│   │   ├── alert.tsx
│   │   ├── tabs.tsx
│   │   ├── separator.tsx
│   │   └── scroll-area.tsx
│   │
│   ├── navigation.tsx           # Top navigation bar
│   │
│   ├── rpcs/
│   │   └── add-chain-dialog.tsx
│   │
│   ├── dexes/
│   │   └── dex-dialog.tsx
│   │
│   ├── tokens/
│   │   └── token-dialog.tsx
│   │
│   ├── pools/
│   │   └── pool-dialog.tsx
│   │
│   └── strategies/
│       ├── strategy-dialog.tsx
│       └── manage-pools-dialog.tsx
│
└── lib/
    ├── api.ts                   # Centralized API client
    ├── types.ts                 # TypeScript interfaces
    └── utils.ts                 # Helper functions (cn)
```

## API Client Architecture

The `lib/api.ts` file provides a centralized API client with the following structure:

```typescript
// Base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

// Grouped API functions
export const dexApi = { getAll, getById, create, update, delete };
export const tokenApi = { getAll, getById, create, update, delete, addAddress, updateAddress, deleteAddress };
export const poolApi = { getAll, getById, getCrossChain, getOnChain, getByPair, getByAddress, create, update, delete };
export const strategyApi = { getAll, getById, getByType, create, update, delete, addPool, removePool };
export const evmListenerApi = { configure, addChain, removeChain, restartChain, stopAll, getStatus, getChainStatus, getChains };
```

All API calls:
- Use centralized fetch wrapper
- Include proper error handling
- Return typed responses
- Handle HTTP status codes appropriately

## Type Definitions

All TypeScript types are defined in `lib/types.ts` and mirror the backend API DTOs:

- `Dex`, `CreateDexDto`, `UpdateDexDto`
- `Token`, `TokenAddress`, `CreateTokenDto`, `UpdateTokenDto`
- `Pool`, `CreatePoolDto`, `UpdatePoolDto`
- `Strategy`, `CreateStrategyDto`, `UpdateStrategyDto`
- `ChainConfigDto`, `ConfigureChainsDto`, `EvmListenerStatus`

## UI/UX Features

### Error Handling
- All API errors are caught and displayed to users
- Clear error messages in Alert components
- Form validation before submission
- Network error handling

### Loading States
- Loading spinners during API calls
- Disabled buttons during operations
- Skeleton states for better UX

### Confirmations
- Delete confirmations prevent accidental data loss
- Clear action feedback

### Responsive Design
- Mobile-friendly layout
- Responsive grids (1 column mobile, 2 tablet, 3 desktop)
- Touch-friendly button sizes
- Scrollable dialogs for mobile

### Data Refresh
- Manual refresh buttons on all pages
- Auto-refresh after mutations
- Optimistic updates where appropriate

## Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3200
```

### Backend Requirements

The UI expects the Arb Engine backend to be running and accessible at the configured URL. All API endpoints should return proper CORS headers to allow browser access.

## Running the Application

### Development Mode
```bash
cd ui
pnpm install
pnpm dev
```

Access at: http://localhost:3001

### Production Build
```bash
cd ui
pnpm build
pnpm start
```

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3001
CMD ["pnpm", "start"]
```

## Testing Recommendations

1. **Unit Tests**: Test utility functions in `lib/utils.ts`
2. **Integration Tests**: Test API client functions with mock backend
3. **E2E Tests**: Use Playwright or Cypress for full user flows
4. **Component Tests**: Test individual dialogs and forms

## Future Enhancements

Potential improvements for future iterations:

1. **Real-time Updates**: WebSocket integration for live status updates
2. **Charts & Analytics**: Visualize trading performance and metrics
3. **Dark Mode**: Theme toggle for user preference
4. **Order History**: View and track past arbitrage orders
5. **User Authentication**: Login system for multi-user access
6. **Notifications**: Toast notifications for actions
7. **Filtering & Search**: Advanced filtering for large datasets
8. **Export Functionality**: Export data to CSV/JSON
9. **Batch Operations**: Bulk add/delete operations
10. **Settings Page**: Application-level configuration

## Design Patterns

### Component Patterns
- **Container/Presentation**: Pages fetch data, components display it
- **Composition**: Small, reusable components
- **Custom Hooks**: Could be extracted for data fetching

### State Management
- **Local State**: React useState for component-specific state
- **No Global State**: Each page manages its own data
- **Future**: Consider React Query or SWR for caching

### Form Handling
- **Controlled Components**: All inputs are controlled
- **Validation**: Client-side validation before API calls
- **Error Display**: Inline error messages

## Accessibility

- Semantic HTML throughout
- ARIA labels on interactive elements (via shadcn/ui)
- Keyboard navigation support
- Focus management in dialogs
- Screen reader friendly

## Performance Considerations

- **Static Generation**: Pages pre-rendered where possible
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component (if images added)
- **Bundle Size**: Minimal dependencies, tree-shaking enabled

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features required
- No IE11 support

## Maintenance Notes

### Adding New Features
1. Define types in `lib/types.ts`
2. Add API functions to `lib/api.ts`
3. Create page in `app/[feature]/page.tsx`
4. Create dialog component in `components/[feature]/`
5. Add route to navigation in `components/navigation.tsx`

### Updating Dependencies
```bash
pnpm update
pnpm audit
```

### Code Style
- TypeScript strict mode enabled
- ESLint configuration included
- Prettier for formatting (via Next.js)
- Follow Next.js conventions

## Summary

The Arb Engine UI provides a complete, production-ready management interface for the arbitrage trading engine. It follows modern web development best practices, uses type-safe TypeScript throughout, and provides a polished user experience with shadcn/ui components.

The application is ready to deploy and can be extended with additional features as the platform grows.
