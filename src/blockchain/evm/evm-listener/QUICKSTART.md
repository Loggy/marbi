# EVM Listener - Quick Start Guide

Get up and running with the EVM Listener module in 5 minutes!

## Prerequisites

- Redis server (for message queue)
- WebSocket RPC endpoints for EVM chains

## Step 1: Start Redis

```bash
# Using Docker (recommended)
docker run -d --name redis -p 6379:6379 redis:alpine

# Or install locally
# macOS: brew install redis && redis-server
# Linux: sudo apt install redis-server && redis-server
```

## Step 2: Configure Environment

Add to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Step 3: Start the Application

```bash
pnpm run dev
```

The server will start on `http://localhost:3000` (or your configured port).

## Step 4: Configure a Chain to Monitor

### Option A: Via API

```bash
curl -X POST http://localhost:3000/evm-listener/chain \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 1,
    "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
  }'
```

### Option B: Via Environment Variable

Add to your `.env`:

```env
EVM_LISTENER_CHAINS={"1":"wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"}
```

Then restart the application.

## Step 5: Verify It's Working

Check the status:

```bash
curl http://localhost:3000/evm-listener/status
```

You should see:

```json
{
  "success": true,
  "totalChains": 1,
  "activeChains": 1,
  "workers": [
    {
      "chainId": 1,
      "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/...",
      "isActive": true
    }
  ]
}
```

Check the logs - you should see messages like:

```
[INFO] Block worker started for chain 1 at wss://...
[INFO] New block on chain 1: #12345678
```

Register it in your module:

```typescript
@Module({
  imports: [
    BullModule.registerQueue({ name: "block-events" }),
  ],
  providers: [MyBlockProcessor],
})
export class YourModule {}
```

## Common Chain Configurations

### Ethereum Mainnet (Chain ID: 1)
```json
{
  "chainId": 1,
  "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
}
```

### BSC (Chain ID: 56)
```json
{
  "chainId": 56,
  "rpcUrl": "wss://bsc-mainnet.ws.example.com"
}
```

### Polygon (Chain ID: 137)
```json
{
  "chainId": 137,
  "rpcUrl": "wss://polygon-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
}
```

### Arbitrum One (Chain ID: 42161)
```json
{
  "chainId": 42161,
  "rpcUrl": "wss://arb-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
}
```

### Base (Chain ID: 8453)
```json
{
  "chainId": 8453,
  "rpcUrl": "wss://base-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
}
```

## Testing with Multiple Chains

```bash
curl -X POST http://localhost:3000/evm-listener/configure \
  -H "Content-Type: application/json" \
  -d '{
    "chains": [
      {
        "chainId": 1,
        "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-KEY"
      },
      {
        "chainId": 137,
        "rpcUrl": "wss://polygon-mainnet.ws.alchemyapi.io/v2/YOUR-KEY"
      }
    ]
  }'
```

## Useful Commands

### Check status of all chains
```bash
curl http://localhost:3000/evm-listener/status
```

### Check specific chain
```bash
curl http://localhost:3000/evm-listener/status/1
```

### Stop monitoring a chain
```bash
curl -X DELETE http://localhost:3000/evm-listener/chain/1
```

### Restart a chain worker
```bash
curl -X POST http://localhost:3000/evm-listener/chain/1/restart
```

### Stop all monitoring
```bash
curl -X POST http://localhost:3000/evm-listener/stop-all
```

## Troubleshooting

### ❌ "Failed to connect to chain X"
- Verify your WebSocket URL is correct
- Check your API key is valid
- Ensure the URL starts with `wss://` or `ws://`

### ❌ "Redis connection failed"
- Make sure Redis is running: `redis-cli ping` (should return "PONG")
- Check Redis host/port in `.env`

### ❌ "Worker already exists"
- This is just a warning - the old worker will be replaced
- Or use the restart endpoint to restart cleanly

### ❌ Not seeing block events
- Check worker status: `curl http://localhost:3000/evm-listener/status`
- Verify `isActive: true`
- Check application logs for errors

## Next Steps

- Read [USAGE_EXAMPLE.md](./USAGE_EXAMPLE.md) for advanced examples
- Read [README.md](./README.md) for technical details
- Check [EVM_LISTENER_IMPLEMENTATION.md](../../../EVM_LISTENER_IMPLEMENTATION.md) for architecture

## Need Help?

Check the logs! They contain detailed information about:
- Worker startup/shutdown
- Connection status
- Block events received
- Any errors encountered

---

**You're all set!** 🚀 Your EVM listener is now monitoring blockchain blocks in real-time.

