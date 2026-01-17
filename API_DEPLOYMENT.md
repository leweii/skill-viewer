# API Deployment Guide

## Prerequisites

1. Vercel account (https://vercel.com)
2. Supabase project (https://supabase.com)
3. LemonSqueezy account (https://lemonsqueezy.com)
4. Gemini API key (https://ai.google.dev)

## Supabase Setup

1. Create a new Supabase project
2. Run the migration script in SQL Editor: `scripts/setup-db.sql`
3. Enable GitHub and Google OAuth providers in Authentication settings
4. Copy your project URL and service key

## Vercel Deployment

1. Fork/clone this repository
2. Import to Vercel
3. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `GEMINI_API_KEY`
   - `LEMONSQUEEZY_WEBHOOK_SECRET`
4. Deploy

## LemonSqueezy Setup

1. Create a product for "Skill Viewer Pro"
2. Set up webhook pointing to `https://your-vercel-app.vercel.app/api/webhook/lemonsqueezy`
3. Configure webhook secret in Vercel environment variables

## Extension Configuration

Update these values in the extension code:
- `extension/options.js`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLOUD_API_URL`
- `extension/lib/cloud.js`: `CLOUD_API_URL`
- `extension/background.js`: `CLOUD_API_URL`

## Testing

1. Run `npm run dev` for local Vercel development
2. Test with `curl`:
   ```bash
   curl -X POST http://localhost:3000/api/summarize \
     -H "Content-Type: application/json" \
     -d '{"repo":"owner/repo","skillPath":".claude/skills/test","skillName":"test","skillContent":"# Test","language":"en"}'
   ```
