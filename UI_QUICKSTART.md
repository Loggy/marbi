# Arb Engine UI - Quick Start Guide

This guide will help you get the Arb Engine UI up and running in minutes.

## Prerequisites

- Node.js 18 or higher
- pnpm package manager
- Arb Engine backend running (default: http://localhost:3200)

## Installation

1. Navigate to the UI directory:
```bash
cd ui
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment configuration:
```bash
# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3200" > .env.local
```

If your backend is running on a different URL or port, update the `NEXT_PUBLIC_API_URL` value accordingly.

## Running the Application

### Development Mode (with hot reload)
```bash
pnpm dev
```

The UI will be available at: **http://localhost:3001**

### Production Build
```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## First-Time Setup Workflow

Follow this order to set up your arbitrage engine:

### 1. Configure RPC Connections (`/rpcs`)
Add blockchain RPC endpoints you want to monitor:
- Navigate to **RPCs** page
- Click **"Add Chain"**
- Enter Chain ID (e.g., 1 for Ethereum, 56 for BSC, 8453 for Base)
- Enter WebSocket RPC URL (must start with `ws://` or `wss://`)
- Click **"Add Chain"**
- Monitor status to ensure connection is successful

Example:
- Chain ID: `1`
- RPC URL: `wss://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`

### 2. Add DEXes (`/dexes`)
Configure the decentralized exchanges you want to use:
- Navigate to **DEXes** page
- Click **"Add DEX"**
- Enter DEX name (e.g., "Uniswap V2", "PancakeSwap")
- Enter Swap Topic (event signature hash)
- Optionally add liquidity topics
- Click **"Create"**

Common swap topics:
- Uniswap V2/V3: `0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822`

### 3. Add Tokens (`/tokens`)
Add tokens you want to trade:
- Navigate to **Tokens** page
- Click **"Add Token"**
- Enter Symbol (e.g., "USDC")
- Enter Name (e.g., "USD Coin")
- Add addresses for each chain:
  - Click **"Add Address"**
  - Enter contract address
  - Enter chain ID
  - Enter decimals (typically 18 for most tokens, 6 for USDC)
- Click **"Create"**

Example Token:
- Symbol: `WETH`
- Name: `Wrapped Ether`
- Addresses:
  - Ethereum (1): `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`, 18 decimals
  - Base (8453): `0x4200000000000000000000000000000000000006`, 18 decimals

### 4. Add Pools (`/pools`)
Configure liquidity pools for monitoring:
- Navigate to **Pools** page
- Click **"Add Pool"**
- Enter Pool Address
- Enter Chain ID
- Select Token 0 from dropdown
- Enter Token 0 address on that chain
- Select Token 1 from dropdown
- Enter Token 1 address on that chain
- Select DEX from dropdown
- Optionally enter fee in basis points (e.g., 30 for 0.3%)
- Click **"Create"**

Example Pool:
- Pool Address: `0x...`
- Chain ID: `1`
- Token 0: WETH
- Token 1: USDC
- DEX: Uniswap V2
- Fee: 30 (0.3%)

### 5. Create Strategies (`/strategies`)
Set up trading strategies and assign pools:
- Navigate to **Strategies** page
- Click **"Add Strategy"**
- Enter Strategy Type (e.g., "dex-to-dex", "cross-chain")
- Click **"Create"**
- Click **"Manage Pools"** on the strategy card
- Add pools from the "Available Pools" column by clicking the + icon
- Remove pools from "Assigned Pools" by clicking the X icon
- Click **"Close"** when done

## Common Chain IDs

| Blockchain | Chain ID |
|------------|----------|
| Ethereum Mainnet | 1 |
| BSC | 56 |
| Polygon | 137 |
| Base | 8453 |
| Arbitrum One | 42161 |
| Optimism | 10 |

## Troubleshooting

### UI can't connect to backend
- Verify backend is running: `curl http://localhost:3200`
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Check browser console for CORS errors
- Ensure backend has CORS enabled for UI origin

### WebSocket RPC connection fails
- Verify RPC URL is WebSocket (`wss://` or `ws://`)
- Test RPC URL separately
- Check RPC provider rate limits
- Verify API key if using service like Alchemy or Infura

### Pools not showing in strategy assignment
- Ensure pool is not already assigned to another strategy
- Verify pool was created successfully
- Refresh the page

### Build errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm build
```

## Development Tips

### Hot Module Replacement
The dev server supports hot reload - changes to components, pages, and styles will update automatically without refreshing the page.

### TypeScript Errors
All TypeScript errors must be resolved before building. Check the terminal output for type errors.

### Adding Custom Chain Names
Edit `app/tokens/page.tsx` and `app/pools/page.tsx` to add custom chain names:
```typescript
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  56: "BSC",
  // Add your chain here
  999: "My Custom Chain",
};
```

### Debugging API Calls
Open browser DevTools → Network tab to inspect API requests and responses. The API client logs errors to console.

## Next Steps

Once you've configured RPCs, DEXes, tokens, pools, and strategies:

1. Monitor RPC status to ensure connections are stable
2. Verify pools are correctly configured with right token addresses
3. Check strategy pool assignments
4. Start the arbitrage engine backend to begin monitoring
5. Monitor logs and performance

## Useful Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Update dependencies
pnpm update

# Clean build
rm -rf .next && pnpm build
```

## Support

For issues or questions:
- Check backend logs at the arb-engine main directory
- Verify API endpoints are accessible
- Check browser console for errors
- Review [UI_IMPLEMENTATION.md](./UI_IMPLEMENTATION.md) for detailed documentation

## Production Deployment

### Option 1: Node.js Server
```bash
pnpm build
pnpm start
```

### Option 2: Docker
```bash
docker build -t arb-engine-ui .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:3200 arb-engine-ui
```

### Option 3: Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set environment variable in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` → your backend URL

### Option 4: Static Export (if needed)
Add to `next.config.ts`:
```typescript
export default {
  output: 'export',
};
```

Then:
```bash
pnpm build
# Deploy the 'out' directory to any static host
```

## Port Configuration

The UI runs on **port 3001** by default to avoid conflicts with the backend (port 3200) and other services.

To change the port, edit the scripts in `package.json`:
```json
"scripts": {
  "dev": "next dev -p YOUR_PORT",
  "start": "next start -p YOUR_PORT"
}
```

## Security Notes

- Never commit `.env.local` to version control
- Use environment variables for API URLs
- Enable CORS properly on backend
- Use HTTPS in production
- Implement authentication if exposing publicly
- Rate limit API endpoints
- Sanitize user inputs (handled by TypeScript types + validation)

---

You're now ready to manage your arbitrage trading engine! 🚀
