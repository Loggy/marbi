# EVM Listener Module

A NestJS module that monitors new blocks on multiple EVM-compatible chains via WebSocket connections and publishes block events to a message queue.

## Features

- **Multi-chain Support**: Monitor multiple EVM chains simultaneously
- **WebSocket Connections**: Real-time block updates via WebSocket RPC
- **Message Queue Integration**: Block events published to Bull queue backed by Redis
- **Automatic Reconnection**: Built-in reconnection logic for resilient operation
- **RESTful API**: Full control via HTTP endpoints
- **Background Workers**: Each chain runs in its own isolated worker

## Architecture

```
EVMListenerModule
├── EVMListenerService (manages workers)
├── BlockWorkerService (per-chain WebSocket listener)
├── EVMListenerController (REST API)
└── Bull Queue (block-events)
```

## Installation

The module is already installed as part of the main application. Required dependencies:

```bash
pnpm add @nestjs/bull bull viem
```

## Configuration

### Environment Variables

Set up Redis connection for Bull queue in your `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password_here
```

### Chain Configuration

Configure chains to monitor via environment variable (optional):

```env
EVM_LISTENER_CHAINS={"1":"wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY","56":"wss://bsc-mainnet.ws.example.com"}
```

Or configure dynamically via API endpoints.

## API Endpoints

### Configure Multiple Chains
```http
POST /evm-listener/configure
Content-Type: application/json

{
  "chains": [
    {
      "chainId": 1,
      "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
    },
    {
      "chainId": 56,
      "rpcUrl": "wss://bsc-mainnet.ws.example.com"
    }
  ]
}
```

### Add Single Chain
```http
POST /evm-listener/chain
Content-Type: application/json

{
  "chainId": 1,
  "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
}
```

### Remove Chain
```http
DELETE /evm-listener/chain/1
```

### Restart Chain
```http
POST /evm-listener/chain/1/restart
```

### Get Status of All Chains
```http
GET /evm-listener/status
```

Response:
```json
{
  "success": true,
  "totalChains": 2,
  "activeChains": 2,
  "workers": [
    {
      "chainId": 1,
      "rpcUrl": "wss://eth-mainnet.ws.example.com",
      "isActive": true
    }
  ]
}
```

### Get Status of Specific Chain
```http
GET /evm-listener/status/1
```

### Get Configured Chain IDs
```http
GET /evm-listener/chains
```

### Stop All Chains
```http
POST /evm-listener/stop-all
```

## Block Event Format

Block events published to the `block-events` queue have the following structure:

```typescript
{
  chainId: number;        // Chain ID (e.g., 1 for Ethereum)
  blockNumber: bigint;    // Block number
  timestamp: bigint;      // Block timestamp (seconds)
  hash: string;           // Block hash
}
```


## Error Handling

- **Connection Errors**: Automatic reconnection with exponential backoff (max 5 attempts)
- **Invalid URLs**: Validated at configuration time (must be `ws://` or `wss://`)
- **Duplicate Chains**: Automatically replaces existing worker with new configuration

## Supported Chain IDs

Common chain IDs:
- `1` - Ethereum Mainnet
- `56` - BSC (Binance Smart Chain)
- `137` - Polygon
- `42161` - Arbitrum One
- `8453` - Base
- `10` - Optimism

Any EVM-compatible chain with WebSocket RPC support can be monitored.

## Testing

Run unit tests:

```bash
pnpm test tests/evm-listener
```

## Notes

- **WebSocket URLs Only**: HTTP RPC URLs are not supported for real-time block monitoring
- **Redis Required**: Bull queue requires Redis to be running
- **Resource Management**: Each chain worker maintains its own WebSocket connection
- **Reconnection**: Workers automatically attempt to reconnect on connection failure (max 5 attempts)

## Example Usage

```bash
# Start monitoring Ethereum mainnet
curl -X POST http://localhost:3000/evm-listener/chain \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 1,
    "rpcUrl": "wss://eth-mainnet.ws.alchemyapi.io/v2/YOUR-API-KEY"
  }'

# Check status
curl http://localhost:3000/evm-listener/status

# Stop monitoring
curl -X DELETE http://localhost:3000/evm-listener/chain/1
```

