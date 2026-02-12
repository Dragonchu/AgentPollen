#!/bin/bash
# Test script for Caddy reverse proxy setup
# This validates the configuration without actually starting services

set -e

echo "================================================"
echo "Caddy Reverse Proxy Configuration Test"
echo "================================================"
echo ""

# Check prerequisites
echo "1. Checking prerequisites..."
if command -v docker &> /dev/null; then
    echo "   ✓ Docker installed: $(docker --version)"
else
    echo "   ✗ Docker not installed"
    exit 1
fi

if command -v docker compose &> /dev/null; then
    echo "   ✓ Docker Compose installed: $(docker compose version)"
else
    echo "   ✗ Docker Compose not installed"
    exit 1
fi

echo ""

# Validate docker-compose.yml
echo "2. Validating docker-compose.yml..."
if docker compose config > /dev/null 2>&1; then
    echo "   ✓ docker-compose.yml is valid"
else
    echo "   ✗ docker-compose.yml has syntax errors"
    docker compose config
    exit 1
fi

echo ""

# Check Caddyfile exists
echo "3. Checking Caddyfile..."
if [ -f "Caddyfile" ]; then
    echo "   ✓ Caddyfile exists"
else
    echo "   ✗ Caddyfile not found"
    exit 1
fi

echo ""

# Check Dockerfiles
echo "4. Checking Dockerfiles..."
if [ -f "Dockerfile.server" ]; then
    echo "   ✓ Dockerfile.server exists"
else
    echo "   ✗ Dockerfile.server not found"
    exit 1
fi

if [ -f "Dockerfile.web" ]; then
    echo "   ✓ Dockerfile.web exists"
else
    echo "   ✗ Dockerfile.web not found"
    exit 1
fi

echo ""

# Check Next.js config
echo "5. Checking Next.js configuration..."
if grep -q 'basePath: "/arena"' packages/web/next.config.mjs; then
    echo "   ✓ Next.js basePath configured correctly"
else
    echo "   ✗ Next.js basePath not configured"
    exit 1
fi

if grep -q 'output: "standalone"' packages/web/next.config.mjs; then
    echo "   ✓ Next.js standalone output enabled"
else
    echo "   ✗ Next.js standalone output not enabled"
    exit 1
fi

echo ""

# Check WebSocket client configuration
echo "6. Checking WebSocket client configuration..."
if grep -q "getSocketConfig" packages/web/src/lib/useGameSocket.ts; then
    echo "   ✓ WebSocket client supports relative paths"
else
    echo "   ✗ WebSocket client not updated for reverse proxy"
    exit 1
fi

echo ""

# Summary
echo "================================================"
echo "✓ All configuration checks passed!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Copy environment template: cp .env.example .env"
echo "  2. Edit .env with your configuration"
echo "  3. Start services: docker compose up -d"
echo "  4. View logs: docker compose logs -f"
echo "  5. Access app: http://localhost/arena"
echo ""
echo "For production deployment, see DEPLOYMENT.md"
echo "================================================"
