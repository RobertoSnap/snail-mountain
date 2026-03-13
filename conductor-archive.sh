#!/bin/bash

# Exit on error
set -e

WORKSPACE_NAME="${CONDUCTOR_WORKSPACE_NAME:-$(basename "$(pwd)")}"

echo "Archiving workspace: $WORKSPACE_NAME"

# Remove symlinked .env
if [ -L .env ]; then
  echo "Removing .env symlink"
  rm -f .env
elif [ -f .env ]; then
  echo "Removing .env file"
  rm -f .env
fi

# Remove local SQLite database
if [ -f local.db ]; then
  echo "Removing local database"
  rm -f local.db
fi

echo "Archive complete for workspace: $WORKSPACE_NAME"
