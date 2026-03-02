#!/usr/bin/env bash
# ============================================================
#  DMS Web-Mode Update Script (no EXE rebuild needed)
#
#  Run on the SERVER machine after pulling new code.
#  If using Docker, just run: docker compose up -d --build
#  Clients only need to refresh their browser.
# ============================================================
set -e

cd "$(dirname "$0")"

echo "============================================================"
echo "  DMS - Updating to latest version"
echo "============================================================"
echo

# Pull latest code if this is a git checkout
if command -v git &>/dev/null; then
    echo "[1/4] Pulling latest code..."
    git pull || echo "WARNING: git pull failed – continuing with local code."
    echo
else
    echo "[1/4] git not found – skipping pull."
    echo
fi

echo "[2/4] Installing frontend dependencies..."
npm install
echo

echo "[3/4] Building frontend..."
npm run build
echo

echo "[4/4] Installing server dependencies..."
cd server
npm install
cd ..
echo

echo "============================================================"
echo "  Update complete!"
echo "============================================================"
echo
echo "Restart the server to apply changes:"
echo "  node server/index.js"
echo
echo "Or, if using Docker:"
echo "  docker compose up -d --build"
echo
echo "All clients will see the new version on their next page refresh."
echo "No EXE rebuild or redistribution needed."
