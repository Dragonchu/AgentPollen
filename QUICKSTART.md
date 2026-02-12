# Quick Start - Caddy Deployment

Get AI Battle Royale running with zero CORS issues in 3 steps!

## Prerequisites

- Docker and Docker Compose installed
- Port 80 available (or 443 for HTTPS)

## Steps

### 1. Copy Environment Template

```bash
cp .env.example .env
```

Edit `.env` if needed (optional - defaults work for testing):

```bash
# Example: Run with 100 agents
AGENT_COUNT=100

# Example: Enable LLM engine
# AI_ENGINE=llm
# DEEPSEEK_API_KEY=sk-your-api-key-here
```

### 2. Start Services

```bash
docker compose up -d
```

This will:
- Build the server and web containers
- Start Caddy reverse proxy
- Configure all networking automatically

### 3. Open Your Browser

Navigate to: **http://localhost/arena**

That's it! The WebSocket connection works automatically through the same domain.

## View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f server
docker compose logs -f web
docker compose logs -f caddy
```

## Stop Services

```bash
docker compose down
```

## Architecture

```
Your Browser (http://localhost)
      ↓
[Caddy Reverse Proxy]
      ├─→ /arena/*      → Next.js Frontend
      └─→ /api/game/*   → WebSocket Server

✓ Same domain = No CORS issues!
```

## Troubleshooting

### "Port 80 already in use"

Another service (Apache, Nginx, existing Caddy) is using port 80:

```bash
# Check what's using port 80
sudo lsof -i :80

# Stop the conflicting service
sudo systemctl stop apache2
# or
sudo systemctl stop nginx
```

### "Cannot connect to WebSocket"

1. Check if server is running:
   ```bash
   docker compose logs server
   ```

2. Verify Caddy is proxying correctly:
   ```bash
   docker compose logs caddy
   ```

3. Check browser console for errors (F12 → Console)

### "Page shows 404"

Make sure you're accessing `/arena` not just `/`:

- ✓ Correct: http://localhost/arena
- ✗ Wrong: http://localhost

## Production Deployment

For production with a real domain and HTTPS:

1. Edit `Caddyfile` and replace `:80` with your domain:
   ```caddyfile
   yourdomain.com {
       # ... rest stays the same
   }
   ```

2. Point your domain's DNS to your server's IP

3. Start services:
   ```bash
   docker compose up -d
   ```

Caddy will automatically:
- Obtain SSL certificate from Let's Encrypt
- Redirect HTTP to HTTPS
- Renew certificates automatically

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed production configuration.

## Next Steps

- Read [README.md](./README.md) for game features and architecture
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for advanced deployment options
- Explore the codebase in `packages/` directory

Enjoy your CORS-free Battle Royale! 🎮
