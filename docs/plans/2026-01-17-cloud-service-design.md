# Cloud Service Design for Skill Viewer

Date: 2026-01-17

## Overview

Add a cloud service layer to Skill Viewer that provides:
- Centralized skill summarization using server-side LLM API keys
- Database caching to reduce LLM calls
- Usage analytics for skills (view/collect counts)
- Freemium model with one-time payment for pro access

## Business Model

| Tier | Daily Limit | Price |
|------|-------------|-------|
| Free | 5 requests | $0 |
| Pro | 50 requests | $5-10 (one-time) |

- Cache hits do not count against quota
- Pro access is lifetime with daily limits to prevent abuse

## Technology Stack

- **API Hosting**: Vercel Serverless Functions
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Payment**: LemonSqueezy (handles tax compliance, license keys)
- **LLM**: Gemini/OpenAI/Claude (server-side keys)

## Architecture

```
┌─────────────────┐         ┌──────────────────────────────────┐
│  Chrome Extension│         │           Vercel                 │
│  (content.js)   │────────▶│  /api/summarize                  │
│                 │         │  /api/auth/callback              │
└─────────────────┘         │  /api/webhook (LemonSqueezy)     │
                            └──────────────┬───────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
            ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
            │   Supabase   │      │   Supabase   │      │ LemonSqueezy │
            │     Auth     │      │   Database   │      │   (Payment)  │
            └──────────────┘      └──────────────┘      └──────────────┘
```

## Database Schema

```sql
-- Users table (extends Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  license_key TEXT,              -- LemonSqueezy License Key
  daily_usage INT DEFAULT 0,     -- Current day usage count
  usage_reset_date DATE,         -- Last reset date
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills cache table (keyed by repo + skill_path)
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo TEXT NOT NULL,            -- "owner/repo"
  skill_path TEXT NOT NULL,      -- ".claude/skills/skill-name"
  skill_name TEXT NOT NULL,
  skill_content_hash TEXT,       -- For detecting content changes
  view_count INT DEFAULT 0,      -- View statistics
  collect_count INT DEFAULT 0,   -- Collect statistics
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo, skill_path)
);

-- Summary cache table (per language)
CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  language TEXT NOT NULL,        -- "en", "zh-CN", etc.
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, language)
);

-- Indexes
CREATE INDEX idx_skills_repo ON public.skills(repo);
CREATE INDEX idx_summaries_skill_lang ON public.summaries(skill_id, language);
CREATE INDEX idx_summaries_created ON public.summaries(created_at);
```

## API Design

### POST /api/summarize

Main endpoint for skill summarization.

**Request:**
```json
{
  "repo": "owner/repo",
  "skillPath": ".claude/skills/skill-name",
  "skillName": "skill-name",
  "skillContent": "...",
  "language": "en"
}
```

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Response:**
```json
{
  "summary": "...",
  "cached": true
}
```

**Processing Flow:**
1. Validate token → get user_id
2. Check quota:
   - Paid user: ≤ 50/day
   - Free user: ≤ 5/day
   - Exceeded → return 429
3. Query skills table → insert if not exists
4. Query summaries table (skill_id + language + created_at > 7 days ago)
5. Cache hit → return (no quota deduction)
6. Cache miss → call LLM → save to summaries → deduct quota → return
7. Increment view_count

### POST /api/collect

Record skill collection events.

**Request:**
```json
{
  "repo": "owner/repo",
  "skillPath": ".claude/skills/skill-name"
}
```

### GET /api/usage

Get current user quota status.

**Response:**
```json
{
  "isPaid": false,
  "dailyLimit": 5,
  "dailyUsage": 3,
  "resetAt": "2026-01-18T00:00:00Z"
}
```

### POST /api/webhook/lemonsqueezy

Handle payment success webhook.

**Processing:**
1. Verify LemonSqueezy signature
2. Extract user_email or user_id from custom data
3. Update users table: is_paid = true, license_key = ...

## Authentication Flow

```
┌──────────┐    1. Click login   ┌──────────────┐
│ Extension│ ───────────────────▶│ Supabase Auth│
│ Options  │                     │ (OAuth popup)│
└──────────┘                     └──────┬───────┘
                                        │ 2. Login success
     4. Store token                     ▼
┌──────────┐◀───────────────────┌──────────────┐
│ chrome.  │   3. Return token  │  Callback    │
│ storage  │                    │  page        │
└──────────┘                    └──────────────┘
```

**Extension Storage:**
```javascript
chrome.storage.local.set({
  cloudAuth: {
    accessToken: "...",
    refreshToken: "...",
    user: { id, email, isPaid }
  }
});
```

## Payment Flow

```
┌──────────┐  1. Click purchase  ┌───────────────┐
│ Extension│ ───────────────────▶│ LemonSqueezy  │
│ Options  │                     │  Checkout     │
└──────────┘                     └───────┬───────┘
                                         │ 2. Payment success
                                         ▼
┌──────────┐  4. Update status   ┌───────────────┐
│ Supabase │◀────────────────────│ /api/webhook  │
│    DB    │                     │ (Vercel)      │
└──────────┘                     └───────────────┘
                                         ▲
                                 3. Webhook callback
                                 (order_created)
```

## Extension Changes

### Options Page UI

```
┌─────────────────────────────────────────────────┐
│  Settings                                       │
├─────────────────────────────────────────────────┤
│  ☁️ Cloud Service                               │
│  ┌───────────────────────────────────────────┐  │
│  │ Not logged in                             │  │
│  │ [Login with GitHub] [Login with Google]   │  │
│  └───────────────────────────────────────────┘  │
│                    ↓ After login                │
│  ┌───────────────────────────────────────────┐  │
│  │ ✓ Logged in as user@email.com             │  │
│  │ Status: Free (5/5 remaining today)        │  │
│  │ [Upgrade to Pro - $9.99 once] [Logout]    │  │
│  └───────────────────────────────────────────┘  │
│                    ↓ After payment              │
│  ┌───────────────────────────────────────────┐  │
│  │ ✓ Pro User                                │  │
│  │ Usage: 3/50 today                         │  │
│  │ [Logout]                                  │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  🔑 Your Own API Keys (Optional)               │
│  Use your own keys instead of cloud service    │
│  Provider: [Gemini ▼]                          │
│  API Key:  [••••••••••••]                      │
└─────────────────────────────────────────────────┘
```

### Summarize Priority Logic

```javascript
async function getSummary(skill, language) {
  // 1. Prefer cloud service (if logged in)
  const cloudAuth = await getCloudAuth();
  if (cloudAuth?.accessToken) {
    const result = await callCloudAPI(skill, language);
    if (result.success) return result.summary;
    if (result.error === 'quota_exceeded') {
      showUpgradePrompt();
    }
    // Fall through on cloud failure
  }

  // 2. Fallback: user's own API key
  const localKey = await getLocalAPIKey();
  if (localKey) {
    return await callLocalLLM(skill, language);
  }

  // 3. No options: show raw content
  return null;
}
```

## Project Structure

```
skill-viewer/
├── extension/                 # Existing extension code
│   ├── background.js          # Modify: add cloud API calls
│   ├── content.js             # Modify: pass auth token
│   ├── options.js             # Modify: add cloud login/payment UI
│   ├── options.html           # Modify: add cloud service section
│   └── lib/
│       └── cloud.js           # New: cloud API wrapper
│
├── api/                       # New: Vercel Serverless Functions
│   ├── summarize.js           # POST /api/summarize
│   ├── collect.js             # POST /api/collect
│   ├── usage.js               # GET /api/usage
│   └── webhook/
│       └── lemonsqueezy.js    # POST /api/webhook/lemonsqueezy
│
├── lib/                       # New: shared backend code
│   ├── supabase.js            # Supabase client
│   ├── llm.js                 # LLM calls (reuse existing prompt)
│   └── quota.js               # Quota checking logic
│
├── vercel.json                # New: Vercel config
├── package.json               # New: dependencies
└── .env.example               # New: environment variables template
```

## Environment Variables

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
GEMINI_API_KEY=xxx              # Server-side LLM key
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_API_KEY=xxx
```

## Cache Strategy

- **TTL**: 7 days
- **Per-language**: Each language has independent cache
- **Cache hit**: No quota deduction
- **Content hash**: Optional - invalidate cache if skill content changes

## Implementation Phases

| Phase | Content | Deliverable |
|-------|---------|-------------|
| **Phase 1** | Basic cloud service | Working summarize API + DB caching |
| **Phase 2** | User authentication | Supabase Auth integration + extension login UI |
| **Phase 3** | Quota system | Free/paid user distinction + daily limits |
| **Phase 4** | Payment integration | LemonSqueezy + webhook |
| **Phase 5** | Admin analytics | View skill access/collect statistics |

## Security Considerations

- Validate Supabase JWT tokens on every API request
- Verify LemonSqueezy webhook signatures
- Rate limit API endpoints (Vercel built-in)
- Never expose server-side LLM API keys to client
- Use Row Level Security (RLS) in Supabase where appropriate
