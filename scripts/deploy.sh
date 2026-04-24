#!/bin/bash
# Task Manager - Standard Deploy Script
# For regular updates after v2.0 migration is done

set -e
cd /home/ubuntu/task-manager

echo "=== Backup before deploy ==="
bash ./scripts/backup.sh

echo "=== Pulling latest code ==="
git checkout -- .
git pull origin main

echo "=== Installing dependencies ==="
npm install
npm audit fix 2>/dev/null || true

echo "=== Building frontend ==="
npm run build

echo "=== Restarting app ==="
pm2 reload task-manager --update-env

echo "=== Health check ==="
sleep 2
STATUS=$(curl -s http://localhost:4173/api/health | grep -o '"status":"[^"]*"')
echo "$STATUS"

if echo "$STATUS" | grep -q "healthy"; then
    echo "=== Deploy successful! ==="
else
    echo "=== WARNING: Health check failed! ==="
    echo "Check logs: pm2 logs task-manager"
fi
