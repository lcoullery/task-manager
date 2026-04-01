#!/bin/bash
# Task Manager - Standard Deploy Script
# For regular updates after v2.0 migration is done

set -e
cd /home/ubuntu/task-manager

echo "=== Backup before deploy ==="
./scripts/backup.sh

echo "=== Pulling latest code ==="
git checkout -- .
git pull origin main

echo "=== Installing dependencies ==="
npm install

echo "=== Building frontend ==="
npm run build

echo "=== Restarting app ==="
pm2 restart task-manager

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
