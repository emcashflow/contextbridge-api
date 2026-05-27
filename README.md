# ContextBridge

Give your AI agents persistent memory.

**Problem:** AI agents forget everything when the session ends.  
**Solution:** ContextBridge provides simple, persistent memory for any AI agent.

## 🚀 Quick Start

### 1. Sign up
Get your API key at [contextbridge.io](https://contextbridge.io)

### 2. Install SDK
```bash
npm install @contextbridge/sdk
```

### 3. Use it
```typescript
import { ContextBridge } from '@contextbridge/sdk';

const cb = new ContextBridge({ apiKey: 'your-key' });

// Store a memory
await cb.remember("User prefers dark mode");

// Later... it remembers!
const { memories } = await cb.recall();
```

## 📦 Packages

| Package | Description |
|---------|-------------|
| [`@contextbridge/sdk`](./sdk) | JavaScript/TypeScript SDK |
| [`@contextbridge/api`](./api) | Self-hosted API server |

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Your App   │────▶│    SDK      │────▶│    API      │
│  (Agent)    │◀────│  (Client)   │◀────│  (Server)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ PostgreSQL  │
                                        └─────────────┘
```

## 🛠️ Self-Hosting

See [api/README.md](./api/README.md) for deployment instructions.

### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/YOUR_TEMPLATE_ID)

## 💰 Pricing

| Plan | Price | Operations | Memories |
|------|-------|------------|----------|
| Hobby | Free | 10K/month | 1,000 |
| Pro | $49/mo | 100K/month | Unlimited |
| Business | $199/mo | 1M/month | Unlimited |

## 📄 License

MIT - See [LICENSE](./LICENSE)

## 🙏 Credits

Built by the [Solo Software Guide](https://solosoftwareguide.com) team.