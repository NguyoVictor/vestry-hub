@echo off
REM Deploy AI Tools Edge Functions to Supabase
REM Run this script after refactoring to deploy the new secure Edge Functions

echo 🚀 Deploying AI Tools Edge Functions...
echo.

REM Deploy generate-ai-content function
echo 📦 Deploying generate-ai-content...
call supabase functions deploy generate-ai-content
if %errorlevel% neq 0 (
  echo ❌ Failed to deploy generate-ai-content
  exit /b 1
)
echo ✅ generate-ai-content deployed successfully
echo.

REM Deploy transcribe-audio function
echo 📦 Deploying transcribe-audio...
call supabase functions deploy transcribe-audio
if %errorlevel% neq 0 (
  echo ❌ Failed to deploy transcribe-audio
  exit /b 1
)
echo ✅ transcribe-audio deployed successfully
echo.

echo 🎉 All Edge Functions deployed successfully!
echo.
echo 📋 Next steps:
echo 1. Verify GROQ_API_KEY secret is set: supabase secrets list
echo 2. If not set, run: supabase secrets set GROQ_API_KEY=your_key_here
echo 3. Remove VITE_GROQ_API_KEY from .env file
echo 4. Test all AI tools at /ai-tools
echo.
pause
