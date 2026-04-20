# AWS App Runner Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Skill Viewer backend API from Vercel serverless functions to AWS App Runner, accessible at `api.sv.jakobhe.com`, with GitHub Actions CI/CD.

**Architecture:** Express.js wraps existing `api/*.js` Vercel-format handlers (zero business logic changes), packaged as a Docker image, pushed to AWS ECR on every `main` push, and deployed to App Runner automatically.

**Tech Stack:** Node.js 20, Express 4, Docker, AWS ECR, AWS App Runner, GitHub Actions

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `server.js` | Express entry point; mounts all route handlers |
| Create | `Dockerfile` | Multi-stage image build |
| Create | `.github/workflows/deploy.yml` | CI/CD pipeline |
| Modify | `package.json` | Add `express`, add `start` script, remove `vercel` dev dep |
| Modify | `API_DEPLOYMENT.md` | Update deployment instructions for AWS |
| (optional later) | `extension/options.js` | Update `CLOUD_API_URL` |
| (optional later) | `extension/lib/cloud.js` | Update `CLOUD_API_URL` |
| (optional later) | `extension/background.js` | Update `CLOUD_API_URL` |

---

## Task 1: Update package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add express and update scripts**

Edit `package.json` to:

```json
{
  "name": "skill-viewer-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "node --test api/**/*.test.js lib/**/*.test.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "alipay-sdk": "^3.6.1",
    "express": "^4.19.2"
  }
}
```

- [ ] **Step 2: Install express**

```bash
npm install express
```

Expected: `package-lock.json` updated, `node_modules/express` present.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add express dependency for App Runner server"
```

---

## Task 2: Create Express server

**Files:**
- Create: `server.js`

- [ ] **Step 1: Create server.js**

```js
// server.js
import express from 'express'
import indexHandler from './api/index.js'
import summarizeHandler from './api/summarize.js'
import checkOrderHandler from './api/check-order.js'
import createQrcodeHandler from './api/create-qrcode.js'
import collectHandler from './api/collect.js'
import usageHandler from './api/usage.js'
import devUpgradeHandler from './api/dev-upgrade.js'
import alipayWebhookHandler from './api/webhook/alipay.js'
import wechatWebhookHandler from './api/webhook/wechat.js'

const app = express()

// WeChat webhook needs raw body for XML signature verification.
// Apply raw body parser ONLY to that route before global JSON parser.
app.use('/api/webhook/wechat', express.raw({ type: '*/*' }))

// Global JSON + form body parser for all other routes
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.all('/', indexHandler)
app.all('/api/summarize', summarizeHandler)
app.all('/api/check-order', checkOrderHandler)
app.all('/api/create-qrcode', createQrcodeHandler)
app.all('/api/collect', collectHandler)
app.all('/api/usage', usageHandler)
app.all('/api/dev-upgrade', devUpgradeHandler)
app.all('/api/webhook/alipay', alipayWebhookHandler)
app.all('/api/webhook/wechat', wechatWebhookHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Skill Viewer API running on port ${PORT}`)
})
```

- [ ] **Step 2: Smoke-test locally**

```bash
node server.js
```

Expected output: `Skill Viewer API running on port 3000`

In a second terminal:
```bash
curl http://localhost:3000/
```

Expected: JSON or HTML status page response (even without env vars, it should not crash).

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add Express server wrapping Vercel-format handlers"
```

---

## Task 3: Create Dockerfile

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create .dockerignore**

```
node_modules
.git
.env
*.zip
docs
scripts
extension
skills
```

- [ ] **Step 2: Create Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Build and test image locally**

```bash
docker build -t skill-viewer-api .
docker run -p 3000:3000 skill-viewer-api
```

Expected: `Skill Viewer API running on port 3000`

In a second terminal:
```bash
curl http://localhost:3000/
```

Expected: status page response without crashing.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add Dockerfile for App Runner deployment"
```

---

## Task 4: AWS One-Time Infrastructure Setup

> This task is done manually in the AWS console / CLI. No code changes.

**Prerequisites:** AWS CLI installed and configured with an admin account.

- [ ] **Step 1: Create ECR repository**

```bash
aws ecr create-repository \
  --repository-name skill-viewer-api \
  --region ap-northeast-1
```

Note the `repositoryUri` from the output (e.g., `123456789.dkr.ecr.ap-northeast-1.amazonaws.com/skill-viewer-api`). You'll need it in later steps.

- [ ] **Step 2: Push initial image to ECR**

```bash
# Replace ACCOUNT_ID and REGION with your values
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-northeast-1
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/skill-viewer-api"

aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

docker build -t skill-viewer-api .
docker tag skill-viewer-api:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest
```

Expected: image visible in ECR console.

- [ ] **Step 3: Create App Runner service via AWS Console**

Go to AWS Console → App Runner → Create service:
- **Source:** Container registry → Amazon ECR
- **Container image URI:** the `repositoryUri:latest` from Step 1
- **ECR access role:** Create new (App Runner needs ECR read access)
- **Port:** `3000`
- **CPU:** 0.25 vCPU, **Memory:** 0.5 GB
- **Auto deployments:** OFF (GitHub Actions will handle this)
- **Environment variables:** Add all of these:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `GEMINI_API_KEY`
  - `ALIPAY_APP_ID`
  - `ALIPAY_PRIVATE_KEY`
  - `ALIPAY_PUBLIC_KEY`
  - `WECHAT_APP_ID`
  - `WECHAT_MCH_ID`
  - `WECHAT_API_KEY`
  - `PAYMENT_AMOUNT`
  - `FREE_DAILY_LIMIT`
  - `PAID_DAILY_LIMIT`

Note the **Service ARN** from the service detail page — needed for GitHub Actions.

Note the **App Runner default URL** (e.g., `xxxx.ap-northeast-1.awsapprunner.com`) — needed for DNS setup.

- [ ] **Step 4: Create IAM user for GitHub Actions**

In IAM console, create a user `github-actions-skill-viewer` with these inline policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["apprunner:StartDeployment"],
      "Resource": "<YOUR_APPRUNNER_SERVICE_ARN>"
    }
  ]
}
```

Create an **Access Key** for this user. Note the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

- [ ] **Step 5: Add GitHub Secrets**

In GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | from Step 4 |
| `AWS_SECRET_ACCESS_KEY` | from Step 4 |
| `AWS_REGION` | `ap-northeast-1` (or your region) |
| `ECR_REPOSITORY` | full ECR URI (e.g. `123456789.dkr.ecr.ap-northeast-1.amazonaws.com/skill-viewer-api`) |
| `APPRUNNER_SERVICE_ARN` | from Step 3 |

---

## Task 5: GitHub Actions CI/CD Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create deploy.yml**

```yaml
name: Deploy to AWS App Runner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to ECR
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t ${{ secrets.ECR_REPOSITORY }}:$IMAGE_TAG .
          docker tag ${{ secrets.ECR_REPOSITORY }}:$IMAGE_TAG ${{ secrets.ECR_REPOSITORY }}:latest
          docker push ${{ secrets.ECR_REPOSITORY }}:$IMAGE_TAG
          docker push ${{ secrets.ECR_REPOSITORY }}:latest

      - name: Deploy to App Runner
        run: |
          aws apprunner start-deployment \
            --service-arn ${{ secrets.APPRUNNER_SERVICE_ARN }}
```

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions CI/CD for App Runner deployment"
git push origin main
```

- [ ] **Step 4: Verify GitHub Actions run**

Go to GitHub repo → Actions tab. The workflow should trigger automatically.

Expected: all steps green. The App Runner service will redeploy.

---

## Task 6: Custom Domain DNS Setup

> Done in AWS Console + your DNS provider (jakobhe.com).

- [ ] **Step 1: Add custom domain in App Runner**

AWS Console → App Runner → your service → Custom domains → Add domain:
- Enter `api.sv.jakobhe.com`
- Click Add

AWS will show you two DNS records to add:
1. A CNAME for `api.sv.jakobhe.com` → `<apprunner-url>`
2. A CNAME for certificate validation (something like `_abc123.api.sv.jakobhe.com`)

- [ ] **Step 2: Add DNS records at your DNS provider**

At wherever jakobhe.com DNS is managed (Cloudflare, Route53, etc.), add the two CNAME records shown by App Runner.

- [ ] **Step 3: Wait for validation**

Certificate validation usually takes 2-10 minutes. When the domain status shows **Active** in App Runner, HTTPS is ready.

- [ ] **Step 4: Verify**

```bash
curl https://api.sv.jakobhe.com/
```

Expected: same status page response as before.

---

## Task 7: Update Extension API URL

**Files:**
- Modify: `extension/options.js`
- Modify: `extension/lib/cloud.js`
- Modify: `extension/background.js`

- [ ] **Step 1: Find current API URL references**

```bash
grep -r "vercel\|CLOUD_API_URL\|awsapprunner" extension/ --include="*.js" -n
```

- [ ] **Step 2: Update CLOUD_API_URL in each file**

Replace the old Vercel URL with `https://api.sv.jakobhe.com` in each file found in Step 1.

- [ ] **Step 3: Verify no old URLs remain**

```bash
grep -r "vercel\.app" extension/ --include="*.js"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add extension/
git commit -m "feat: update extension API URL to api.sv.jakobhe.com"
git push origin main
```

---

## Task 8: Update API_DEPLOYMENT.md

**Files:**
- Modify: `API_DEPLOYMENT.md`

- [ ] **Step 1: Replace Vercel deployment section**

Replace the "Vercel Deployment" section with:

```markdown
## AWS App Runner Deployment

### Prerequisites
- AWS account with ECR and App Runner access
- Docker installed locally
- AWS CLI configured

### One-Time Setup
See `docs/superpowers/plans/2026-04-20-aws-apprunner-migration.md` Tasks 4-6.

### Ongoing Deployment
Push to `main` — GitHub Actions builds and deploys automatically.

### Webhook URLs
Update Alipay and WeChat notify URLs to:
- Alipay: `https://api.sv.jakobhe.com/api/webhook/alipay`
- WeChat: `https://api.sv.jakobhe.com/api/webhook/wechat`
```

- [ ] **Step 2: Commit**

```bash
git add API_DEPLOYMENT.md
git commit -m "docs: update deployment guide for AWS App Runner"
git push origin main
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `curl https://api.sv.jakobhe.com/` returns status page
- [ ] `curl -X POST https://api.sv.jakobhe.com/api/summarize -H "Content-Type: application/json" -d '{"repo":"test/test","skillPath":".claude/skills/test","skillName":"test","skillContent":"# Test","language":"en"}'` responds (even with auth error is fine)
- [ ] GitHub Actions workflow is green on `main`
- [ ] App Runner shows service status as **Running**
- [ ] Extension connects to new URL without errors
