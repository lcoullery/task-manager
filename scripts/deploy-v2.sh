#!/bin/bash
# ===========================================
# Task Manager v2.0 - First Deploy Script
# ===========================================
# ONE-TIME script for migrating from v1.x to v2.0
# After this, use: bash scripts/deploy.sh
# ===========================================

set -e
cd /home/ubuntu/task-manager

echo "=========================================="
echo "  Task Manager v2.0 - First Deploy"
echo "=========================================="
echo ""

# === 1. Backup ===
echo "=== Step 1/6: Backup ==="
./scripts/backup.sh
echo ""

# === 2. Pull latest code ===
echo "=== Step 2/6: Pulling latest code ==="
git pull origin main
echo ""

# === 3. Install dependencies ===
echo "=== Step 3/6: Installing dependencies ==="
npm install
echo ""

# === 4. Build frontend ===
echo "=== Step 4/6: Building frontend ==="
npm run build
echo ""

# === 5. Create .env if needed ===
echo "=== Step 5/6: Checking .env ==="
if [ ! -f .env ]; then
    cp .env.example .env
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    sed -i "s/CHANGE_THIS_SECRET/$JWT_SECRET/" .env
    echo ".env created with random JWT secret."
    echo "Edit /home/ubuntu/task-manager/.env if needed."
else
    echo ".env already exists, skipping."
fi
echo ""

# === 6. Create admin user ===
echo "=== Step 6/6: Create admin user ==="
node scripts/create-admin.js
echo ""

# === Restart with PM2 ===
echo "=== Restarting server ==="
pm2 stop task-manager 2>/dev/null || true
pm2 delete task-manager 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
echo ""

# === Health check ===
sleep 3
STATUS=$(curl -s http://localhost:4173/api/health | grep -o '"status":"[^"]*"' || echo "no response")
echo "$STATUS"

if echo "$STATUS" | grep -q "healthy"; then
    echo "=========================================="
    echo "  v2.0 Deploy successful!"
    echo "=========================================="
else
    echo "=========================================="
    echo "  WARNING: Health check failed!"
    echo "  Check logs: pm2 logs task-manager"
    echo "=========================================="
fi
