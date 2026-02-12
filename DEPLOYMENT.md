# Deployment Guide - Caddy Reverse Proxy Setup

This guide explains how to deploy AI Battle Royale with Caddy as a reverse proxy to completely eliminate CORS issues by serving both the frontend and WebSocket server under the same domain.

## Architecture Overview

```
Client Browser
      ↓
[Caddy Reverse Proxy :80/:443]
      ├─→ /arena/*           → Next.js Frontend (port 3000)
      └─→ /api/game/*        → WebSocket Server (port 3001)
```

**Benefits:**
- ✅ No CORS issues - everything on same domain
- ✅ Single SSL certificate for both services
- ✅ Clean URL structure
- ✅ Production-ready configuration
- ✅ Automatic WebSocket upgrade handling

## Quick Start with Docker Compose

The easiest way to deploy is using Docker Compose:

### 1. Prerequisites

- Docker and Docker Compose installed
- Port 80 (and optionally 443) available

### 2. Configure Environment

Create a `.env` file in the root directory:

```bash
# Game Configuration
AGENT_COUNT=10
TICK_INTERVAL=1000

# AI Engine Configuration
AI_ENGINE=rule-based
# AI_ENGINE=llm
# DEEPSEEK_API_KEY=sk-your-key-here
# DEEPSEEK_MODEL=deepseek-chat
# DEEPSEEK_MAX_CONCURRENCY=10

# Storage Configuration
THINKING_STORAGE=memory
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access the Application

Open your browser to:
- **Frontend:** http://localhost/arena
- **Health Check:** http://localhost/health

The WebSocket connection automatically uses the same domain at `/api/game`.

## Production Deployment

### With Custom Domain

1. **Update Caddyfile** - Replace `:80` with your domain:

```caddyfile
yourdomain.com {
    # ... rest of configuration
}
```

2. **Add HTTPS** - Caddy automatically provisions Let's Encrypt certificates:

```caddyfile
yourdomain.com {
    # Enable HSTS
    header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    
    # ... rest of configuration
}
```

3. **Update DNS** - Point your domain to your server's IP address

4. **Deploy:**

```bash
docker-compose up -d
```

Caddy will automatically:
- Obtain SSL certificate from Let's Encrypt
- Redirect HTTP to HTTPS
- Handle certificate renewal

### Environment Variables for Production

```bash
# .env
AGENT_COUNT=100
TICK_INTERVAL=1000
AI_ENGINE=llm
DEEPSEEK_API_KEY=sk-your-production-key
THINKING_STORAGE=memory
```

## Manual Deployment (Without Docker)

If you prefer to run services directly:

### 1. Install Caddy

```bash
# Linux/macOS
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# macOS with Homebrew
brew install caddy
```

### 2. Build the Application

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### 3. Configure Environment

**Server** (`packages/server/.env`):
```bash
PORT=3001
AGENT_COUNT=10
TICK_INTERVAL=1000
CORS_ORIGIN=*
```

**Web** (`packages/web/.env.local`):
```bash
NEXT_PUBLIC_SERVER_URL=/api/game
```

### 4. Update Caddyfile

Edit the `Caddyfile` to use `localhost` instead of service names:

```caddyfile
:80 {
    # ...
    
    handle /arena* {
        reverse_proxy localhost:3000
    }
    
    handle /api/game/* {
        uri strip_prefix /api/game
        reverse_proxy localhost:3001 {
            # ... WebSocket headers
        }
    }
}
```

### 5. Start Services

```bash
# Terminal 1: Start the game server
cd packages/server
pnpm start

# Terminal 2: Start the web frontend
cd packages/web
pnpm start

# Terminal 3: Start Caddy
caddy run --config Caddyfile
```

### 6. Access the Application

Open http://localhost/arena in your browser.

## URL Path Structure

| Path | Service | Description |
|------|---------|-------------|
| `/` | Caddy | Redirects to `/arena` |
| `/arena` | Next.js | Frontend application |
| `/arena/_next/*` | Next.js | Static assets |
| `/api/game/socket.io/*` | Server | Socket.IO WebSocket endpoint |
| `/health` | Caddy | Health check endpoint |

## WebSocket Connection

The client automatically connects to the WebSocket server using the same domain:

- **Development:** `http://localhost:3001` (direct connection)
- **Production:** `/api/game` (proxied through Caddy)

The configuration in `useGameSocket.ts` automatically detects the environment and uses the appropriate connection method.

## Troubleshooting

### WebSocket Connection Fails

1. **Check Caddy logs:**
   ```bash
   docker-compose logs caddy
   ```

2. **Verify WebSocket upgrade headers:**
   - Open browser DevTools → Network tab
   - Filter by "WS" to see WebSocket connections
   - Check connection status and headers

3. **Test direct connection:**
   ```bash
   # Uncomment ports in docker-compose.yml
   # Then test direct access
   curl http://localhost:3001/socket.io/
   ```

### Frontend Shows Blank Page

1. **Check basePath configuration:**
   - Ensure `basePath: "/arena"` in `next.config.mjs`
   - Verify you're accessing `/arena` not just `/`

2. **Check web logs:**
   ```bash
   docker-compose logs web
   ```

### CORS Errors (Shouldn't happen!)

If you see CORS errors, it means the proxy isn't working correctly:

1. **Verify Caddy configuration:**
   ```bash
   caddy validate --config Caddyfile
   ```

2. **Check service names in docker-compose:**
   - Ensure `reverse_proxy web:3000` and `reverse_proxy server:3001`
   - Service names must match container names in `docker-compose.yml`

### Port Already in Use

```bash
# Find process using port 80
sudo lsof -i :80

# Stop existing Caddy/nginx/apache
sudo systemctl stop caddy
sudo systemctl stop nginx
sudo systemctl stop apache2
```

## Scaling and Load Balancing

For high-traffic deployments, you can scale the backend:

```yaml
# docker-compose.yml
services:
  server:
    # ... existing config
    deploy:
      replicas: 3  # Run 3 instances
```

Update Caddy configuration for load balancing:

```caddyfile
handle /api/game/* {
    uri strip_prefix /api/game
    reverse_proxy server:3001 server:3002 server:3003 {
        lb_policy least_conn
        # ... WebSocket headers
    }
}
```

**Note:** For true horizontal scaling with Socket.IO, you'll need a Redis adapter to sync state across instances.

## Security Considerations

1. **Rate Limiting:**
   ```caddyfile
   rate_limit {
       zone game_api {
           key {remote_host}
           events 100
           window 1m
       }
   }
   ```

2. **Origin Validation:**
   The server's `CORS_ORIGIN=*` is safe because Caddy acts as the gatekeeper. Only requests through Caddy reach the server.

3. **HTTPS in Production:**
   Always use HTTPS with a real domain. Caddy handles this automatically.

4. **Firewall:**
   Only expose port 80/443. Keep 3000/3001 internal to the Docker network.

## Monitoring

### Health Checks

```bash
# Overall health
curl http://localhost/health

# Server health (if exposed for debugging)
curl http://localhost:3001/socket.io/

# Frontend health
curl http://localhost/arena
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f caddy
docker-compose logs -f server
docker-compose logs -f web
```

## Alternative Deployment Platforms

### Railway / Heroku / Fly.io

These platforms typically don't support custom reverse proxy configuration. Instead:

1. Deploy server and web as separate services
2. Set `NEXT_PUBLIC_SERVER_URL=https://your-server.railway.app` in web
3. Set `CORS_ORIGIN=https://your-web.railway.app` in server

This will work but requires proper CORS configuration. Caddy deployment is preferred.

### Kubernetes

For Kubernetes deployment, Caddy can be replaced with an Ingress controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: battle-royale
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /arena
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 3000
      - path: /api/game
        pathType: Prefix
        backend:
          service:
            name: server
            port:
              number: 3001
```

## Summary

With this Caddy setup, you get:

✅ **Zero CORS issues** - All traffic on one domain  
✅ **WebSocket support** - Automatic upgrade handling  
✅ **SSL/TLS** - Free certificates from Let's Encrypt  
✅ **Easy deployment** - One `docker-compose up` command  
✅ **Production ready** - Battle-tested reverse proxy  

Questions? Check the [main README](./README.md) or open an issue!
