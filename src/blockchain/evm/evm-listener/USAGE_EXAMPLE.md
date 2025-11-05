# EVM Listener - Usage Examples

## Quick Start

### 1. Start Redis (Required)
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local Redis
redis-server
```

### 2. Configure Environment Variables
Add to your `.env` file:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Optional: Auto-configure chains on startup
EVM_LISTENER_CHAINS={"1":"wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY","56":"wss://bsc-mainnet.ws.example.com"}
```

### 3. Start Your Application
```bash
pnpm run dev
```

## API Usage Examples

### Example 1: Monitor Ethereum Mainnet

```bash
curl -X POST http://localhost:3000/evm-listener/chain \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 1,
    "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Chain 1 added successfully",
  "chainId": 1
}
```

### Example 2: Monitor Multiple Chains

```bash
curl -X POST http://localhost:3000/evm-listener/configure \
  -H "Content-Type: application/json" \
  -d '{
    "chains": [
      {
        "chainId": 1,
        "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
      },
      {
        "chainId": 56,
        "rpcUrl": "wss://bsc-mainnet.ws.example.com"
      },
      {
        "chainId": 137,
        "rpcUrl": "wss://polygon-mainnet.ws.example.com"
      }
    ]
  }'
```

### Example 3: Check Status

```bash
# All chains
curl http://localhost:3000/evm-listener/status

# Specific chain
curl http://localhost:3000/evm-listener/status/1
```

Response:
```json
{
  "success": true,
  "totalChains": 3,
  "activeChains": 3,
  "workers": [
    {
      "chainId": 1,
      "rpcUrl": "wss://eth-mainnet.ws.example.com",
      "isActive": true
    },
    {
      "chainId": 56,
      "rpcUrl": "wss://bsc-mainnet.ws.example.com",
      "isActive": true
    }
  ]
}
```

### Example 4: Stop Monitoring a Chain

```bash
curl -X DELETE http://localhost:3000/evm-listener/chain/1
```

### Example 5: Restart a Chain Worker

```bash
curl -X POST http://localhost:3000/evm-listener/chain/1/restart
```

## Creating Custom Block Event Processors

### Step 1: Create Your Processor

```typescript
// src/your-module/processors/custom-block.processor.ts
import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { BlockEvent } from "../../blockchain/evm/evm-listener/block-worker.service";

@Processor("block-events")
export class CustomBlockProcessor {
  @Process("new-block")
  async handleNewBlock(job: Job<BlockEvent>) {
    const { chainId, blockNumber, timestamp, hash } = job.data;

    // Your custom logic here
    if (chainId === 1) {
      // Handle Ethereum blocks
      console.log(`New ETH block: ${blockNumber}`);
    } else if (chainId === 56) {
      // Handle BSC blocks
      console.log(`New BSC block: ${blockNumber}`);
    }

    // Fetch block details, monitor events, etc.
  }
}
```

### Step 2: Register in Your Module

```typescript
// src/your-module/your.module.ts
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CustomBlockProcessor } from "./processors/custom-block.processor";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "block-events",
    }),
  ],
  providers: [CustomBlockProcessor],
})
export class YourModule {}
```

## Advanced Usage

### Processing Blocks with Rate Limiting

```typescript
import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import Bottleneck from "bottleneck";

@Processor("block-events")
export class RateLimitedBlockProcessor {
  private limiter: Bottleneck;

  constructor() {
    // Rate limit: 10 requests per second
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 100, // 100ms between requests
    });
  }

  @Process("new-block")
  async handleNewBlock(job: Job<BlockEvent>) {
    return this.limiter.schedule(async () => {
      // Your rate-limited processing logic
      await this.fetchBlockDetails(job.data);
    });
  }

  private async fetchBlockDetails(blockEvent: BlockEvent) {
    // Fetch full block data, transactions, etc.
  }
}
```

### Filtering by Chain

```typescript
@Processor("block-events")
export class ChainSpecificProcessor {
  @Process("new-block")
  async handleNewBlock(job: Job<BlockEvent>) {
    const { chainId, blockNumber } = job.data;

    // Only process Ethereum mainnet blocks
    if (chainId !== 1) {
      return; // Skip other chains
    }

    // Process Ethereum blocks only
    console.log(`Processing ETH block ${blockNumber}`);
  }
}
```


## Common WebSocket RPC Providers

### Alchemy
```
wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY
wss://polygon-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY
wss://arb-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY
```

### Infura
```
wss://mainnet.infura.io/ws/v3/YOUR-PROJECT-ID
wss://polygon-mainnet.infura.io/ws/v3/YOUR-PROJECT-ID
wss://arbitrum-mainnet.infura.io/ws/v3/YOUR-PROJECT-ID
```

### QuickNode
```
wss://your-endpoint.quiknode.pro/YOUR-API-KEY/
```

### Public Endpoints (Limited)
```
wss://ethereum-rpc.publicnode.com
wss://bsc-rpc.publicnode.com
```

## Troubleshooting

### Issue: Worker not starting
**Solution:** Ensure the WebSocket URL is valid and accessible. Check logs for connection errors.

### Issue: Redis connection failed
**Solution:** Verify Redis is running and accessible at the configured host/port.

### Issue: High memory usage
**Solution:** Limit the number of chains being monitored or adjust Bull queue settings.

### Issue: Missing blocks
**Solution:** Check WebSocket connection stability. The worker will attempt to reconnect automatically (max 5 attempts).

### Issue: Duplicate block events
**Solution:** Ensure only one worker per chain is running. Check `getWorkersStatus()` to verify.

## Performance Considerations

- **Memory**: Each worker maintains a WebSocket connection (~1-5MB per connection)
- **CPU**: Minimal, most time is spent waiting for events
- **Network**: Depends on block time and event frequency
- **Redis**: Queue size grows if processing is slower than block production

## Best Practices

1. **Always use WSS (secure WebSocket)** for production
2. **Set up monitoring** for worker health and Redis queue size
3. **Implement error handling** in your processors
4. **Use rate limiting** when making additional RPC calls
5. **Monitor Redis memory usage** and configure TTL for completed jobs
6. **Test WebSocket endpoints** before deploying to production
7. **Use environment variables** for all sensitive configuration

