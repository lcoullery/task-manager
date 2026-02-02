#!/bin/bash

# Task Manager - Quick Launcher

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo ""
    echo "Please install Node.js before running this script:"
    echo ""
    echo "Option 1 - Official installer:"
    echo "  Visit: https://nodejs.org/"
    echo "  Download the LTS version"
    echo ""
    echo "Option 2 - Package manager:"
    echo "  macOS:  brew install node"
    echo "  Ubuntu: sudo apt install nodejs npm"
    echo "  Fedora: sudo dnf install nodejs"
    echo ""
    echo "After installing, verify with: node --version"
    echo ""
    exit 1
fi

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
