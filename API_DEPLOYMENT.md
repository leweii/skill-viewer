# API Deployment Guide

## Prerequisites

1. Vercel account (https://vercel.com)
2. Supabase project (https://supabase.com)
3. Alipay merchant account (https://open.alipay.com)
4. WeChat Pay merchant account (https://pay.weixin.qq.com)
5. Gemini API key (https://ai.google.dev)

## Supabase Setup

1. Create a new Supabase project
2. Run the migration script in SQL Editor: `scripts/setup-db.sql`
3. Enable GitHub and Google OAuth providers in Authentication settings
4. Copy your project URL and service key

## Alipay Setup

1. Register at https://open.alipay.com
2. Create an application and enable "当面付" (Face-to-face payment)
3. Generate RSA2 key pair in the developer console
4. Download the Alipay public key
5. Required credentials:
   - `ALIPAY_APP_ID` - Application ID
   - `ALIPAY_PRIVATE_KEY` - Your RSA2 private key
   - `ALIPAY_PUBLIC_KEY` - Alipay's public key
6. Set notify URL to: `https://api.sv.jakobhe.com/api/webhook/alipay`

## WeChat Pay Setup

1. Register at https://pay.weixin.qq.com
2. Apply for Native Payment capability
3. Required credentials:
   - `WECHAT_APP_ID` - Official Account App ID
   - `WECHAT_MCH_ID` - Merchant ID
   - `WECHAT_API_KEY` - API key (32 characters)
4. Set notify URL to: `https://api.sv.jakobhe.com/api/webhook/wechat`

## AWS App Runner Deployment

### Prerequisites
- AWS account with ECR and App Runner access
- Docker installed locally
- AWS CLI configured

### One-Time Setup
See `docs/superpowers/plans/2026-04-20-aws-apprunner-migration.md` Tasks 4-6 for the full step-by-step guide.

### Ongoing Deployment
Push to `main` — GitHub Actions builds and deploys automatically.

### Environment Variables (set in App Runner console)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `ALIPAY_APP_ID`
- `ALIPAY_PRIVATE_KEY`
- `ALIPAY_PUBLIC_KEY`
- `WECHAT_APP_ID`
- `WECHAT_MCH_ID`
- `WECHAT_API_KEY`
- `PAYMENT_AMOUNT` (default: 39.9)

## Extension Configuration

Update these values in the extension code:
- `extension/options.js`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLOUD_API_URL`
- `extension/lib/cloud.js`: `CLOUD_API_URL`
- `extension/background.js`: `CLOUD_API_URL`

## Testing

1. Run `npm run dev` for local development
2. Test with `curl`:
   ```bash
   curl -X POST http://localhost:3000/api/summarize \
     -H "Content-Type: application/json" \
     -d '{"repo":"owner/repo","skillPath":".claude/skills/test","skillName":"test","skillContent":"# Test","language":"en"}'
   ```
