#!/bin/bash

# Song Library - Quick Test Script
# Run this to verify all fixes are working

echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite

echo ""
echo "✅ Cache cleared!"
echo ""
echo "🚀 Starting dev server..."
echo ""
echo "After server starts:"
echo "  1. Navigate to: http://localhost:8080/media/song-library"
echo "  2. Check browser console (F12) - should be no errors"
echo "  3. Press Ctrl+K to open command palette"
echo "  4. Test search and navigation"
echo ""
echo "Expected: No errors, smooth performance! ✅"
echo ""

npm run dev
