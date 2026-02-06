#!/bin/bash
cd "$( dirname "$0" )"

# Task Manager - Setup/Update Script
# Run this when you pull new code or want to rebuild

echo "========================================"
echo "  Task Manager - Setup"
echo "========================================"
echo ""

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

echo "Node.js detected: $(node --version)"
echo ""

echo "Installing dependencies..."
npm install

echo ""
echo "Building production version..."
npm run build

echo ""
echo "========================================"
echo "  Setup complete!"
echo "  Run ./TaskManager.sh to launch the app"
echo "========================================"
echo ""
