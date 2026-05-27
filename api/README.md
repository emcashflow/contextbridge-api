# ContextBridge API

Give your AI agents persistent memory.

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Create account
- `POST /auth/login` - Get API key

### Memories (requires API key header: `X-API-Key`)
- `POST /memories/remember` - Store a memory
- `GET /memories/recall` - Retrieve memories
- `DELETE /memories/forget/:id` - Delete one memory
- `DELETE /memories/forget-all` - Delete all memories

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | 3000 |
| `CORS_ORIGIN` | Allowed CORS origins | * |

## Deployment

### Railway (Recommended)
1. Connect GitHub repo to Railway
2. Add PostgreSQL database
3. Deploy automatically

### Render
1. Create Web Service
2. Add PostgreSQL database
3. Set environment variables
4. Deploy

## License

MIT