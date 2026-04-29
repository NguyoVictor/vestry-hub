#!/bin/bash

# Deploy AI Tools Edge Functions to Supabase
# Run this script after refactoring to deploy the new secure Edge Functions

echo "🚀 Deploying AI Tools Edge Functions..."
echo ""

# Deploy generate-ai-content function
echo "📦 Deploying generate-ai-content..."
supabase functions deploy generate-ai-content
if [ $? -eq 0 ]; then
  echo "✅ generate-ai-content deployed successfully"
else
  echo "❌ Failed to deploy generate-ai-content"
  exit 1
fi

echo ""

# Deploy transcribe-audio function
echo "📦 Deploying transcribe-audio..."
supabase functions deploy transcribe-audio
if [ $? -eq 0 ]; then
  echo "✅ transcribe-audio deployed successfully"
else
  echo "❌ Failed to deploy transcribe-audio"
  exit 1
fi

echo ""
echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Verify GROQ_API_KEY secret is set: supabase secrets list"
echo "2. If not set, run: supabase secrets set GROQ_API_KEY=your_key_here"
echo "3. Remove VITE_GROQ_API_KEY from .env file"
echo "4. Test all AI tools at /ai-tools"
echo ""
