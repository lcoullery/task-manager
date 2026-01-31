#!/bin/bash

# Task Manager - Quick Launcher

# Check if dist folder exists (production build)
if [ ! -d "dist" ]; then
    echo "First time setup detected..."
    echo "Installing dependencies..."
    npm install
    echo ""
    echo "Building production version..."
    npm run build
    echo ""
else
    echo "Starting server..."
fi

# Open browser (cross-platform)
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:4173 &
elif command -v open > /dev/null; then
    open http://localhost:4173
fi

# Start server
echo "========================================"
echo "  Server running at http://localhost:4173"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node server.js
