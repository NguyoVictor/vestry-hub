#!/bin/bash

# Clear Vite cache script
echo "🧹 Clearing Vite cache..."

# Remove Vite cache directory
rm -rf node_modules/.vite

echo "✅ Vite cache cleared!"
echo ""
echo "Now restart the dev server with: npm run dev"
