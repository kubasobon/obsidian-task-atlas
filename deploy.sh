#!/bin/sh
set -e

VAULT="$1"

if [ -z "$VAULT" ]; then
  echo "Usage: npm run deploy -- /path/to/your/vault"
  exit 1
fi

PLUGIN_DIR="$VAULT/.obsidian/plugins/task-atlas"

if [ ! -d "$VAULT/.obsidian" ]; then
  echo "Error: '$VAULT' does not look like an Obsidian vault (.obsidian folder not found)"
  exit 1
fi

npm run build

mkdir -p "$PLUGIN_DIR"
cp bin/main.js manifest.json "$PLUGIN_DIR/"

echo "Deployed to $PLUGIN_DIR"
echo "Reload Obsidian to pick up changes."
