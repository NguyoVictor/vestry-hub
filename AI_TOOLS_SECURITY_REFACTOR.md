# AI Tools Security Refactor — Complete

## Overview
Refactored AI Tools page to use Supabase Edge Functions instead of calling Groq API directly from the frontend. This ensures the GROQ_API_KEY never touches the browser and remains secure in Supabase Edge Function secrets.

## Changes Made

### 1. Created New Edge Functions

#### `supabase/functions/generate-ai-content/index.ts`
- **Purpose**: Handles all AI content generation requests (translation, lesson plans, letters, bulletins, worship suggestions)
- **Input**: `{ prompt: string, model?: string }`
- **Output**: `{ content: string }`
- **Security**: GROQ_API_KEY accessed via `Deno.env.get("GROQ_API_KEY")` (server-side only)

#### `supabase/functions/transcribe-audio/index.ts`
- **Purpose**: Handles audio transcription and formatting for Voice to Sermon Notes tool
- **Input**: FormData with audio file and optional formatPrompt
- **Output**: `{ transcript: string, formattedNotes: string }`
- **Security**: GROQ_API_KEY accessed via `Deno.env.get("GROQ_API_KEY")` (server-side only)

### 2. Updated Frontend Code

#### `src/pages/media/AITools.tsx`

**Before**:
```typescript
const groqKey = import.meta.env.VITE_GROQ_API_KEY;
const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  headers: { "Authorization": `Bearer ${groqKey}` },
  // ...
});
```

**After**:
```typescript
const { data, error } = await supabase.functions.invoke('generate-ai-content', {
  body: { prompt }
});
```

**Changes**:
- Removed all `import.meta.env.VITE_GROQ_API_KEY` references
- Replaced direct Groq API calls with Supabase Edge Function invocations
- Updated error handling to work with Edge Function responses

### 3. Environment Variables

**Frontend (.env) - REMOVE**:
```
VITE_GROQ_API_KEY=xxx  ← DELETE THIS
```

**Supabase Edge Functions (Secrets) - KEEP**:
```
GROQ_API_KEY=xxx  ← This is already set in Supabase
```

## Deployment Steps

### 1. Deploy Edge Functions
```bash
# Deploy the new Edge Functions
supabase functions deploy generate-ai-content
supabase functions deploy transcribe-audio
```

### 2. Verify Secrets
```bash
# Check that GROQ_API_KEY is set in Supabase
supabase secrets list
```

If not set:
```bash
supabase secrets set GROQ_API_KEY=your_groq_api_key_here
```

### 3. Remove Frontend Environment Variable
Remove `VITE_GROQ_API_KEY` from `.env` file (if it exists)

### 4. Test the Changes
1. Start the dev server: `npm run dev`
2. Navigate to `/ai-tools`
3. Test each tool:
   - Translation Tool
   - Children's Lesson Planner
   - Pastoral Letter Writer
   - Weekly Bulletin Generator
   - Worship Song Suggester
   - Voice to Sermon Notes

## Security Benefits

✅ **API Key Never Exposed**: GROQ_API_KEY never sent to browser  
✅ **Server-Side Only**: All API calls happen on Supabase Edge Functions  
✅ **CORS Protected**: Edge Functions have proper CORS headers  
✅ **Production Ready**: Follows Supabase best practices for secrets management  

## Tools Affected

All 6 AI tools now use secure Edge Functions:
1. ✅ Weekly Bulletin Generator
2. ✅ Translation Tool
3. ✅ Children's Lesson Planner
4. ✅ Pastoral Letter Writer
5. ✅ Worship Song Suggester
6. ✅ Voice to Sermon Notes

## Testing Checklist

- [ ] Deploy Edge Functions to Supabase
- [ ] Verify GROQ_API_KEY secret is set
- [ ] Remove VITE_GROQ_API_KEY from .env
- [ ] Test Translation Tool
- [ ] Test Children's Lesson Planner
- [ ] Test Pastoral Letter Writer
- [ ] Test Weekly Bulletin Generator
- [ ] Test Worship Song Suggester
- [ ] Test Voice to Sermon Notes (with microphone)
- [ ] Verify no API key errors in browser console
- [ ] Verify AI generation works correctly

## Notes

- The Edge Functions use the same Groq models and prompts as before
- No changes to UI or user experience
- Error handling improved with better Edge Function error messages
- All existing functionality preserved
