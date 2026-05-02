#!/bin/bash

echo "🧹 Cleaning up..."
rm -rf node_modules/.vite

echo "✅ Cache cleared!"
echo ""
echo "🚀 Starting dev server..."
npm run dev
