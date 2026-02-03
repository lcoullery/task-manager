#!/bin/bash
cd "$( dirname "$0" )"

# Task Manager - Quick Launcher

# Function to apply pending update
apply_update() {
    echo "Creating backup of current version..."
    rm -rf ".backup"
    mkdir -p ".backup"

    [ -d "dist" ] && cp -r "dist" ".backup/" || true
    [ -d "src" ] && cp -r "src" ".backup/" || true
    [ -f "server.js" ] && cp "server.js" ".backup/" || true
    [ -f "package.json" ] && cp "package.json" ".backup/" || true
    [ -f "config.json" ] && cp "config.json" ".backup/" || true

    echo "Preserving local settings..."
    [ -f "config.json" ] && cp "config.json" ".backup/config.json.local" || true

    echo "Extracting update files..."
    ZIPFILE=$(ls .updates/*.zip 2>/dev/null | head -1)

    if [ -z "$ZIPFILE" ]; then
        echo "ERROR: No update ZIP file found!"
        rollback
        return 1
    fi

    unzip -q "$ZIPFILE" -d ".updates/extracted" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to extract update!"
        rollback
        return 1
    fi

    echo "Applying update files..."
    for dir in .updates/extracted/*/; do
        cp -r "$dir"* . 2>/dev/null || true
    done

    echo "Installing dependencies..."
    npm install >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "ERROR: npm install failed!"
        rollback
        return 1
    fi

    echo "Building application..."
    npm run build >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "ERROR: npm run build failed!"
        rollback
        return 1
    fi

    echo "Restoring local settings..."
    [ -f ".backup/config.json.local" ] && cp ".backup/config.json.local" "config.json" || true

    echo "Cleaning up update files..."
    rm -f ".update-pending.json"
    rm -rf ".updates"
    rm -rf ".backup"

    echo "Update applied successfully!"
    return 0
}

# Function to rollback on failure
rollback() {
    echo "ROLLING BACK to previous version..."
    [ -d ".backup/dist" ] && cp -r ".backup/dist" . || true
    [ -d ".backup/src" ] && cp -r ".backup/src" . || true
    [ -f ".backup/server.js" ] && cp ".backup/server.js" . || true
    [ -f ".backup/package.json" ] && cp ".backup/package.json" . || true
    [ -f ".backup/config.json" ] && cp ".backup/config.json" . || true

    rm -f ".update-pending.json"
    rm -rf ".backup"
    rm -rf ".updates"
}

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

# === CHECK FOR PENDING UPDATE ===
if [ -f ".update-pending.json" ]; then
    echo "Applying pending update..."
    apply_update
    if [ $? -ne 0 ]; then
        echo "UPDATE FAILED! Starting with current version..."
    fi
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
