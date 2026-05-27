# ContextBridge SDK

JavaScript/TypeScript SDK for ContextBridge - Give your AI agents persistent memory.

## Installation

```bash
npm install @contextbridge/sdk
```

## Quick Start

```typescript
import { ContextBridge } from '@contextbridge/sdk';

const cb = new ContextBridge({
  apiKey: 'your-api-key',
  // baseUrl: 'https://api.contextbridge.io' // Optional, defaults to production
});

// Store a memory
await cb.remember("User prefers dark mode and uses VS Code");

// Retrieve memories
const { memories } = await cb.recall();
console.log(memories);
// → [{ id: '...', content: "User prefers dark mode and uses VS Code", ... }]

// Search memories
const { memories: results } = await cb.recall({ query: "dark mode" });

// Delete a memory
await cb.forget(memoryId);

// Delete all memories
await cb.forgetAll();
```

## Configuration

```typescript
interface ContextBridgeConfig {
  apiKey: string;           // Required - Get from contextbridge.io
  baseUrl?: string;         // Optional - Custom API endpoint
}
```

## Methods

### `remember(content, options?)`

Store a memory.

```typescript
await cb.remember("Important context", {
  sessionId: "session-123",     // Optional - Group by session
  agentId: "my-agent",          // Optional - Group by agent
  metadata: { key: "value" },   // Optional - Any JSON data
  ttl: 3600,                    // Optional - Expire after seconds
});
```

### `recall(options?)`

Retrieve memories.

```typescript
const { memories, count } = await cb.recall({
  sessionId: "session-123",     // Optional - Filter by session
  agentId: "my-agent",          // Optional - Filter by agent
  query: "search term",         // Optional - Text search
  limit: 10,                    // Optional - Max results (default: 10)
});
```

### `forget(memoryId)`

Delete a specific memory.

```typescript
await cb.forget("memory-uuid");
```

### `forgetAll(options?)`

Delete all memories (optionally filtered).

```typescript
// Delete everything
await cb.forgetAll();

// Delete by session
await cb.forgetAll({ sessionId: "session-123" });

// Delete by agent
await cb.forgetAll({ agentId: "my-agent" });
```

## Error Handling

```typescript
try {
  await cb.remember("Something important");
} catch (error) {
  console.error('Failed to store memory:', error.message);
}
```

## License

MIT