# AWS App Runner Migration Design

**Date:** 2026-04-20  
**Scope:** Migrate Skill Viewer backend API from Vercel to AWS App Runner  
**Static site:** Stays on GitHub Pages (no change)

## Goal

Move the `api/` backend to AWS App Runner, accessible at `api.sv.jakobhe.com`, with GitHub Actions handling all deployments on push to `main`.

## Architecture

```
GitHub push to main
  → GitHub Actions
  → docker build
  → docker push → AWS ECR (container registry)
  → aws apprunner start-deployment
  → App Runner pulls new image and redeploys
  → api.sv.jakobhe.com (CNAME → App Runner URL)
```

## Code Changes

Minimal — no changes to existing `api/*.js` business logic. Vercel's `handler(req, res)` signature is directly compatible with Express route handlers.

### New files

| File | Purpose |
|------|---------|
| `server.js` | Express entry point; mounts all api handlers as routes |
| `Dockerfile` | Multi-stage Node.js image build |
| `.github/workflows/deploy.yml` | CI/CD pipeline |

### Route mapping

```
POST /api/summarize          → api/summarize.js
GET  /api/check-order        → api/check-order.js
POST /api/create-qrcode      → api/create-qrcode.js
POST /api/collect            → api/collect.js
GET  /api/usage              → api/usage.js
POST /api/dev-upgrade        → api/dev-upgrade.js
POST /api/webhook/alipay     → api/webhook/alipay.js
POST /api/webhook/wechat     → api/webhook/wechat.js
GET  /                       → api/index.js (status page)
```

### server.js structure

```js
import express from 'express'
import summarize from './api/summarize.js'
import checkOrder from './api/check-order.js'
// ... etc

const app = express()
app.use(express.json())

app.all('/api/summarize', summarize)
app.all('/api/check-order', checkOrder)
// ... etc

app.listen(process.env.PORT || 3000)
```

## Dockerfile

- Base: `node:20-alpine`
- Install only production deps (`npm ci --omit=dev`)
- Expose port 3000
- Run `node server.js`

## GitHub Actions (deploy.yml)

Triggers on: `push` to `main`

Steps:
1. Configure AWS credentials (via GitHub Secrets)
2. Login to ECR
3. Build and tag Docker image
4. Push image to ECR
5. Trigger App Runner deployment via `aws apprunner start-deployment`

Required GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `ECR_REPOSITORY` (ECR repo URI)
- `APPRUNNER_SERVICE_ARN`

## AWS Infrastructure (one-time manual setup)

1. Create ECR repository: `skill-viewer-api`
2. Create App Runner service pointing to ECR repo
   - Port: 3000
   - CPU: 0.25 vCPU, Memory: 0.5 GB (cheapest tier)
   - Auto-deploy: disabled (GitHub Actions handles this)
3. Set environment variables in App Runner console (same as current Vercel env vars)
4. Add custom domain `api.sv.jakobhe.com` in App Runner
5. Add CNAME record in DNS: `api.sv.jakobhe.com → <apprunner-url>`

## Environment Variables

Same as current Vercel setup — set in App Runner service configuration:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `ALIPAY_APP_ID`, `ALIPAY_PRIVATE_KEY`, `ALIPAY_PUBLIC_KEY`
- `WECHAT_APP_ID`, `WECHAT_MCH_ID`, `WECHAT_API_KEY`
- `PAYMENT_AMOUNT`, `FREE_DAILY_LIMIT`, `PAID_DAILY_LIMIT`

## Extension Code Update

After deployment, update `CLOUD_API_URL` references in:
- `extension/options.js`
- `extension/lib/cloud.js`
- `extension/background.js`

Change from current Vercel URL to `https://api.sv.jakobhe.com`

## Out of Scope

- Vercel teardown (can be done after verifying the new deployment)
- Static docs site (stays on GitHub Pages)
- Database migration (Supabase stays unchanged)
