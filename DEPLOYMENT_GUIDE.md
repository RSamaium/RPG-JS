# Deployment Guide - ARE-LOGIC-RPG-JS-2D_MMORPG

## Overview

This guide covers deploying the RPGJS v5 ARE-Logic Engine to a VPS using Docker and Node.js.

## Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ (for local builds)
- pnpm package manager
- VPS with at least 2GB RAM, 10GB storage
- Git access to repository

## Deployment Methods

### Method 1: Docker Deployment (Recommended)

#### Build Docker Image

```bash
# Clone repository
git clone https://github.com/OuroborosCollective/ARE-LOGIC-RPG-JS-2D_Mmorpg.git
cd ARE-LOGIC-RPG-JS-2D_Mmorpg

# Build image
docker build -t are-logic-rpg:latest .

# Tag for registry (optional)
docker tag are-logic-rpg:latest your-registry/are-logic-rpg:latest
docker push your-registry/are-logic-rpg:latest
```

#### Run Docker Container

```bash
# Basic run
docker run -d \
  --name are-logic-rpg \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -v are-logic-world:/app/world_data \
  are-logic-rpg:latest

# With environment variables
docker run -d \
  --name are-logic-rpg \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e PAYPAL_CLIENT_ID=your_id \
  -e PAYPAL_CLIENT_SECRET=your_secret \
  -v are-logic-world:/app/world_data \
  are-logic-rpg:latest
```

#### Docker Compose (Production Setup)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  are-logic-rpg:
    image: are-logic-rpg:latest
    container_name: are-logic-rpg
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      PAYPAL_CLIENT_ID: ${PAYPAL_CLIENT_ID}
      PAYPAL_CLIENT_SECRET: ${PAYPAL_CLIENT_SECRET}
    volumes:
      - are-logic-world:/app/world_data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: are-logic-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - are-logic-rpg
    restart: unless-stopped

volumes:
  are-logic-world:
    driver: local
```

Create `.env` file:

```bash
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
NODE_ENV=production
PORT=3000
```

Deploy:

```bash
docker-compose up -d
```

### Method 2: Node.js Direct Deployment

#### Prerequisites

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@10.25.0
```

#### Build & Deploy

```bash
# Clone and setup
git clone https://github.com/OuroborosCollective/ARE-LOGIC-RPG-JS-2D_Mmorpg.git
cd ARE-LOGIC-RPG-JS-2D_Mmorpg

# Install dependencies
pnpm install --no-frozen-lockfile

# Build all packages
pnpm build

# Build sample app
cd samples/sample-dev
RPG_TYPE=mmorpg pnpm build

# Start server
node dist/server/express.js
```

#### PM2 Process Manager (Recommended)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'are-logic-rpg',
      script: './samples/sample-dev/dist/server/express.js',
      cwd: '/path/to/ARE-LOGIC-RPG-JS-2D_Mmorpg',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Save startup script
pm2 startup
pm2 save
```

## Nginx Configuration

Create `nginx.conf`:

```nginx
upstream are_logic_backend {
    server are-logic-rpg:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # WebSocket support
    location / {
        proxy_pass http://are_logic_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://are_logic_backend;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
```

## Health Checks

### Docker Health Check

```bash
# Check container status
docker ps | grep are-logic-rpg

# View logs
docker logs -f are-logic-rpg

# Test endpoint
curl http://localhost:3000/
```

### API Health Endpoint

Add to `src/server.ts`:

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

## Monitoring & Logging

### Docker Logs

```bash
# Real-time logs
docker logs -f are-logic-rpg

# Last 100 lines
docker logs --tail 100 are-logic-rpg

# With timestamps
docker logs -f --timestamps are-logic-rpg
```

### PM2 Logs

```bash
# View logs
pm2 logs

# Clear logs
pm2 flush

# Save logs
pm2 save
```

## Backup & Recovery

### Backup World Data

```bash
# Docker volume backup
docker run --rm -v are-logic-world:/data -v $(pwd):/backup \
  alpine tar czf /backup/world_data_backup.tar.gz -C /data .

# Restore
docker run --rm -v are-logic-world:/data -v $(pwd):/backup \
  alpine tar xzf /backup/world_data_backup.tar.gz -C /data
```

### Database Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups/are-logic"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup world data
docker run --rm -v are-logic-world:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/world_data_$TIMESTAMP.tar.gz -C /data .

# Keep only last 7 days
find $BACKUP_DIR -name "world_data_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/world_data_$TIMESTAMP.tar.gz"
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
docker run -p 8080:3000 are-logic-rpg:latest
```

### Out of Memory

```bash
# Increase Docker memory limit
docker run -m 2g are-logic-rpg:latest

# Or in docker-compose.yml
services:
  are-logic-rpg:
    mem_limit: 2g
```

### WebSocket Connection Issues

```bash
# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:3000/parties
```

## Scaling

### Horizontal Scaling with Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy service
docker service create \
  --name are-logic-rpg \
  --replicas 3 \
  -p 3000:3000 \
  are-logic-rpg:latest

# Scale up
docker service scale are-logic-rpg=5
```

### Load Balancing

Use Nginx upstream with multiple backend instances:

```nginx
upstream are_logic_backend {
    server are-logic-rpg-1:3000;
    server are-logic-rpg-2:3000;
    server are-logic-rpg-3:3000;
}
```

## Security Checklist

- [ ] Enable HTTPS/SSL
- [ ] Set strong environment variables
- [ ] Use firewall rules (allow only 80, 443)
- [ ] Enable rate limiting in Nginx
- [ ] Implement DDoS protection
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup data regularly
- [ ] Use secrets management (Vault, etc.)

## Performance Optimization

### Caching Strategy

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### Database Optimization

- Index frequently queried fields
- Implement connection pooling
- Monitor slow queries

### Node.js Optimization

```bash
# Enable clustering
NODE_CLUSTER_MODE=true node dist/server/express.js

# Increase max listeners
node --max-old-space-size=4096 dist/server/express.js
```

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [v5]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t are-logic-rpg:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          docker tag are-logic-rpg:${{ github.sha }} your-registry/are-logic-rpg:latest
          docker push your-registry/are-logic-rpg:latest
      
      - name: Deploy to VPS
        run: |
          ssh user@your-vps.com 'cd /app && docker-compose pull && docker-compose up -d'
```

## Support & Monitoring

- Monitor CPU, RAM, disk usage
- Set up alerts for service failures
- Regular log analysis
- Performance metrics tracking
- User feedback monitoring

---

**Last Updated:** 2026-04-10
**Version:** 1.0.0
