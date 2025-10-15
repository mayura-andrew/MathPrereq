# 🚀 Alibaba Cloud Deployment Guide

Complete guide for deploying MathPrereq on Alibaba Cloud (阿里云).

## 📋 Prerequisites

### Alibaba Cloud Services Required

1. **ECS Instance** (Elastic Compute Service)
   - Recommended: ecs.c6.xlarge (4 vCPU, 8GB RAM)
   - OS: Ubuntu 22.04 LTS or CentOS 8
   - Storage: 100GB SSD minimum

2. **Optional Services**
   - **SLB** (Server Load Balancer) for production traffic
   - **OSS** (Object Storage Service) for file storage
   - **RDS** (if using managed MongoDB)
   - **VPC** (Virtual Private Cloud) for network isolation
   - **Security Groups** configured properly

### Required Software
- Docker 24.0+
- Docker Compose 2.20+
- Git
- Nginx (for reverse proxy)

## 🔧 Initial Server Setup

### 1. Connect to Your ECS Instance

```bash
# Using SSH with your key pair
ssh -i /path/to/your-key.pem root@your-ecs-ip

# Or using username/password
ssh ubuntu@your-ecs-ip
```

### 2. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Install Required Tools

```bash
# Install Git and other essentials
sudo apt install -y git nginx certbot python3-certbot-nginx

# Install Node.js (for frontend builds)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Go (for backend)
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

## 📦 Application Deployment

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/mathprereq
sudo chown -R $USER:$USER /opt/mathprereq

# Clone the repository
cd /opt/mathprereq
git clone <your-repository-url> .
```

### 2. Configure Environment Variables

```bash
# Copy and edit environment files
cp .env.example .env
cp go-backend/.env.example go-backend/.env

# Edit with your production values
nano .env
```

Required environment variables:
```bash
# Server Configuration
ENVIRONMENT=production
PORT=8080
HOST=0.0.0.0

# Database Connections
MONGODB_HOST=mongodb
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=<strong-password>
MONGODB_DATABASE=mathprereq
MONGODB_AUTH_SOURCE=admin

NEO4J_URI=neo4j://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<strong-password>

# Weaviate Configuration (use Weaviate Cloud)
WEAVIATE_HOST=<your-cluster>.weaviate.network
WEAVIATE_SCHEME=https
WEAVIATE_API_KEY=<your-weaviate-api-key>
WEAVIATE_CLASS_NAME=MathChunk

# LLM Configuration
LLM_PROVIDER=gemini  # or openai, groq
LLM_API_KEY=<your-llm-api-key>
LLM_MODEL=gemini-pro
LLM_MAX_TOKENS=2000

# Security
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Build and Deploy with Docker

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify all services are running
docker-compose -f docker-compose.prod.yml ps
```

### 4. Setup Nginx Reverse Proxy

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/mathprereq
```

Add configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/mathprereq /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Setup SSL with Let's Encrypt

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Verify with:
sudo certbot renew --dry-run
```

## 🔒 Alibaba Cloud Security Configuration

### 1. Configure Security Groups

In Alibaba Cloud Console:

**Inbound Rules:**
| Protocol | Port | Source | Description |
|----------|------|--------|-------------|
| TCP | 22 | Your IP | SSH access |
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 8080 | 127.0.0.1/32 | Backend API (local only) |

**Outbound Rules:**
- Allow all outbound traffic (for API calls, updates)

### 2. Setup Firewall (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to application ports
sudo ufw deny 5173
sudo ufw deny 8080

# Check status
sudo ufw status
```

## 📊 Monitoring & Logging

### 1. Setup Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/mathprereq
```

Add:
```
/opt/mathprereq/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### 2. Monitor Docker Containers

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Monitor resources
docker stats

# Health checks
docker-compose -f docker-compose.prod.yml ps
```

### 3. Setup Alibaba Cloud Monitoring

- Enable **CloudMonitor** for your ECS instance
- Configure alerts for:
  - CPU usage > 80%
  - Memory usage > 85%
  - Disk usage > 90%
  - Network bandwidth limits

## 🔄 Deployment Automation

### Quick Deployment Script

Create `/opt/mathprereq/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting MathPrereq deployment..."

# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
sleep 10

# Run health check
curl -f http://localhost:8080/health || exit 1

echo "✅ Deployment completed successfully!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

## 🔧 Maintenance Tasks

### Database Backups

```bash
# MongoDB backup
docker exec mathprereq-mongodb mongodump --out /backup/$(date +%Y%m%d)

# Neo4j backup
docker exec mathprereq-neo4j neo4j-admin dump --to=/backups/neo4j-$(date +%Y%m%d).dump
```

### Update Application

```bash
cd /opt/mathprereq
git pull origin main
./deploy.sh
```

### View Logs

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f go-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🌍 Alibaba Cloud Specific Optimizations

### 1. Use OSS for Static Assets

```go
// Configure OSS in your Go backend
import "github.com/aliyun/aliyun-oss-go-sdk/oss"

client, _ := oss.New(
    "oss-cn-hangzhou.aliyuncs.com",
    os.Getenv("ALIBABA_ACCESS_KEY"),
    os.Getenv("ALIBABA_SECRET_KEY"),
)
```

### 2. CDN Configuration

- Setup Alibaba CDN for static assets
- Configure edge locations near your users
- Enable HTTPS acceleration

### 3. Database Scaling

Consider using managed services:
- **ApsaraDB for MongoDB** (managed MongoDB)
- **Graph Database Service** (managed graph DB)

## 📈 Performance Tuning

### Docker Resource Limits

Update `docker-compose.prod.yml`:

```yaml
services:
  go-backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Nginx Caching

Add to Nginx config:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    # ...existing proxy settings...
}
```

## 🆘 Troubleshooting

### Common Issues

**Container won't start:**
```bash
docker-compose -f docker-compose.prod.yml logs <service-name>
docker inspect <container-name>
```

**Database connection errors:**
```bash
# Check network connectivity
docker network inspect mathprereq-network
# Test connection from backend
docker exec -it mathprereq-go-backend ping mongodb
```

**High memory usage:**
```bash
# Check container stats
docker stats --no-stream
# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## 📞 Support Resources

- Alibaba Cloud Support: https://www.alibabacloud.com/support
- Documentation: https://www.alibabacloud.com/help
- Community Forum: https://www.alibabacloud.com/forum

---

**🎉 Your MathPrereq application is now deployed on Alibaba Cloud!**
