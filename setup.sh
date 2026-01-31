#!/bin/bash

# Task Manager - Setup/Update Script
# Run this when you pull new code or want to rebuild

echo "========================================"
echo "  Task Manager - Setup"
echo "========================================"
echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building production version..."
npm run build

echo ""
echo "========================================"
echo "  Setup complete!"
echo "  Run ./start.sh to launch the app"
echo "========================================"
echo ""
