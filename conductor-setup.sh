#!/bin/bash

# Exit on error
set -e

WORKSPACE_NAME="${CONDUCTOR_WORKSPACE_NAME:-$(basename "$(pwd)")}"

echo "Setting up SnailMountain for workspace: $WORKSPACE_NAME"

echo "Installing dependencies..."
pnpm install

# Symlink .env from root project
if [ -f "$CONDUCTOR_ROOT_PATH/.env" ]; then
  echo "Symlinking .env from Conductor root"
  ln -sf "$CONDUCTOR_ROOT_PATH/.env" .env
else
  echo "No .env found in root, copying .env.example"
  cp .env.example .env
  echo "WARNING: Update .env with real values before running"
fi

# Push database schema (SQLite is local per workspace)
echo "Pushing database schema..."
pnpm db:push --force

echo ""
echo "Setup complete for workspace: $WORKSPACE_NAME"
echo "Run with: conductor run"
