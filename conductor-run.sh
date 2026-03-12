#!/bin/bash

# Exit on error
set -e

if [ ! -f .env ]; then
  echo ".env file not found. Run setup first."
  exit 1
fi

pnpm dev --port "$CONDUCTOR_PORT"
