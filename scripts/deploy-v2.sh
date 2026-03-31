#!/bin/bash
# ===========================================
# Task Manager v2.0 - Migration Deploy Script
# ===========================================
# This script is a ONE-TIME deploy for migrating
# from v1.x (JSON) to v2.0 (SQLite + JWT auth).
#
# After this, use the normal deploy.sh
# ===========================================

set -e
cd /home/ubuntu/task-manager

echo "=========================================="
echo "  Task Manager v2.0 - Migration Deploy"
echo "=========================================="
echo ""

# === 1. Backup ===
echo "=== Step 1/7: Backup ==="
./scripts/backup.sh
echo ""

# === 2. Pull latest code ===
echo "=== Step 2/7: Pulling latest code ==="
git pull origin main
echo ""

# === 3. Install dependencies ===
echo "=== Step 3/7: Installing dependencies ==="
npm install
echo ""

# === 4. Build frontend ===
echo "=== Step 4/7: Building frontend ==="
npm run build
echo ""

# === 5. Create .env if it doesn't exist ===
echo "=== Step 5/7: Checking .env ==="
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env

    # Generate a random JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    sed -i "s/CHANGE_THIS_SECRET/$JWT_SECRET/" .env

    echo ""
    echo "================================================"
    echo "  .env created with a random JWT secret."
    echo "  Edit it if you need to configure email (SMTP)."
    echo "  File: /home/ubuntu/task-manager/.env"
    echo "================================================"
    echo ""
else
    echo ".env already exists, skipping."
fi
echo ""

# === 6. Run migration (JSON → SQLite) ===
echo "=== Step 6/7: Database migration ==="
if [ -f data/taskmanager.db ]; then
    echo "Database already exists, skipping migration."
else
    if [ -f data/tasks.json ]; then
        echo "Migrating tasks.json to SQLite..."
        echo "You will be asked to create an admin password."
        echo ""
        node scripts/migrate-to-sqlite.js
    else
        echo "WARNING: No tasks.json found. Starting fresh."
        echo "The database will be created on first server start."
    fi
fi
echo ""

# === 7. Restart with PM2 ===
echo "=== Step 7/7: Restarting server ==="
# Stop old server (might fail if not running, that's ok)
pm2 stop task-manager 2>/dev/null || true
pm2 delete task-manager 2>/dev/null || true

# Start with new ecosystem config (server.cjs)
pm2 start ecosystem.config.cjs
pm2 save
echo ""

# === Health check ===
echo "=== Health check ==="
sleep 3
STATUS=$(curl -s http://localhost:4173/api/health | grep -o '"status":"[^"]*"' || echo "no response")
echo "$STATUS"
echo ""

if echo "$STATUS" | grep -q "healthy"; then
    echo "=========================================="
    echo "  v2.0 Deploy successful!"
    echo ""
    echo "  Next steps:"
    echo "  - Login at your app URL"
    echo "  - Check .env for email config (optional)"
    echo "=========================================="
else
    echo "=========================================="
    echo "  WARNING: Health check failed!"
    echo "  Check logs: pm2 logs task-manager"
    echo "=========================================="
fi
