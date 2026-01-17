# Cloud Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cloud-based skill summarization with Supabase (auth + DB) and LemonSqueezy (payment).

**Architecture:** Vercel serverless functions handle API requests, Supabase stores users/skills/summaries, extension calls cloud API with fallback to local API keys.

**Tech Stack:** Vercel, Supabase (PostgreSQL + Auth), LemonSqueezy, Gemini API

---

## Phase 1: Project Setup & Basic API

### Task 1.1: Initialize Node.js Project

**Files:**
- Create: `package.json`
- Create: `vercel.json`
- Create: `.env.example`

**Step 1: Create package.json**

```json
{
  "name": "skill-viewer-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vercel dev",
    "test": "node --test api/**/*.test.js lib/**/*.test.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "vercel": "^33.0.0"
  }
}
```

**Step 2: Create vercel.json**

```json
{
  "version": 2,
  "builds": [
    { "src": "api/**/*.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" }
  ]
}
```

**Step 3: Create .env.example**

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
GEMINI_API_KEY=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
```

**Step 4: Add to .gitignore**

Append to existing `.gitignore`:
```
node_modules/
.env
.vercel/
```

**Step 5: Commit**

```bash
git add package.json vercel.json .env.example .gitignore
git commit -m "chore: initialize vercel project with dependencies"
```

---

### Task 1.2: Create Supabase Client Library

**Files:**
- Create: `lib/supabase.js`

**Step 1: Create Supabase client wrapper**

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

export async function verifyToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await getSupabase().auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}
```

**Step 2: Commit**

```bash
git add lib/supabase.js
git commit -m "feat: add supabase client library"
```

---

### Task 1.3: Create LLM Library (Reuse Prompt)

**Files:**
- Create: `lib/llm.js`

**Step 1: Create LLM wrapper with Gemini support**

```javascript
// lib/llm.js

const LANGUAGE_NAMES = {
  "en": "English",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  "ja": "Japanese",
  "ko": "Korean",
  "es": "Spanish",
  "fr": "French",
  "de": "German"
};

function buildPrompt(skillName, skillContent, language) {
  const langInstruction = language && language !== 'en'
    ? `\n\nRespond in ${LANGUAGE_NAMES[language] || 'English'}.`
    : '';

  return `You are summarizing a Claude Code skill for developers browsing GitHub.

Skill name: ${skillName}
Skill content:
---
${skillContent}
---

Analyze the skill and provide a summary in this exact format:

**Line 1 - Capability badges (only include ones that apply, separated by " | "):**
- ⚠️ Code Execution - ONLY if the skill contains actual executable code (bash commands, scripts, code blocks that will run). Do NOT include this badge just because the skill documentation mentions "code", "bash", or "command" in explanatory text.
- ⚠️ External Access - if the skill calls external APIs, fetches URLs, or accesses network resources
- 📁 File Operations - if the skill reads, writes, or modifies files

**Line 2+ - Description (2-3 sentences):**
What does this skill do and when should a developer use it? Keep it practical and scannable.

Example output format:
⚠️ Code Execution | 📁 File Operations

Automates git commit workflows with AI-generated messages. Use when you want consistent, descriptive commits without writing messages manually.${langInstruction}`;
}

export async function summarizeWithGemini(skillName, skillContent, language) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: buildPrompt(skillName, skillContent, language) }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 400
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Empty response from Gemini');
  }

  return data.candidates[0].content.parts[0].text.trim();
}
```

**Step 2: Commit**

```bash
git add lib/llm.js
git commit -m "feat: add LLM library with Gemini support"
```

---

### Task 1.4: Create Basic Summarize API (No Auth)

**Files:**
- Create: `api/summarize.js`

**Step 1: Create summarize endpoint**

```javascript
// api/summarize.js
import { getSupabase } from '../lib/supabase.js';
import { summarizeWithGemini } from '../lib/llm.js';

const CACHE_TTL_DAYS = 7;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repo, skillPath, skillName, skillContent, language = 'en' } = req.body;

    if (!repo || !skillPath || !skillName || !skillContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = getSupabase();

    // 1. Find or create skill record
    let { data: skill } = await supabase
      .from('skills')
      .select('id')
      .eq('repo', repo)
      .eq('skill_path', skillPath)
      .single();

    if (!skill) {
      const { data: newSkill, error } = await supabase
        .from('skills')
        .insert({ repo, skill_path: skillPath, skill_name: skillName })
        .select('id')
        .single();

      if (error) throw error;
      skill = newSkill;
    }

    // 2. Check for cached summary
    const cacheThreshold = new Date();
    cacheThreshold.setDate(cacheThreshold.getDate() - CACHE_TTL_DAYS);

    const { data: cachedSummary } = await supabase
      .from('summaries')
      .select('summary')
      .eq('skill_id', skill.id)
      .eq('language', language)
      .gte('created_at', cacheThreshold.toISOString())
      .single();

    if (cachedSummary) {
      // Update view count
      await supabase.rpc('increment_view_count', { skill_id: skill.id });
      return res.status(200).json({ summary: cachedSummary.summary, cached: true });
    }

    // 3. Generate new summary
    const summary = await summarizeWithGemini(skillName, skillContent, language);

    // 4. Cache the summary (upsert)
    await supabase
      .from('summaries')
      .upsert(
        { skill_id: skill.id, language, summary, created_at: new Date().toISOString() },
        { onConflict: 'skill_id,language' }
      );

    // 5. Update view count
    await supabase.rpc('increment_view_count', { skill_id: skill.id });

    return res.status(200).json({ summary, cached: false });
  } catch (error) {
    console.error('Summarize error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Step 2: Commit**

```bash
git add api/summarize.js
git commit -m "feat: add /api/summarize endpoint with caching"
```

---

### Task 1.5: Database Migration Script

**Files:**
- Create: `scripts/setup-db.sql`

**Step 1: Create SQL migration file**

```sql
-- scripts/setup-db.sql
-- Run this in Supabase SQL Editor

-- Skills cache table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_content_hash TEXT,
  view_count INT DEFAULT 0,
  collect_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo, skill_path)
);

-- Summary cache table
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, language)
);

-- Users table (for auth integration later)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  license_key TEXT,
  daily_usage INT DEFAULT 0,
  usage_reset_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_repo ON public.skills(repo);
CREATE INDEX IF NOT EXISTS idx_summaries_skill_lang ON public.summaries(skill_id, language);
CREATE INDEX IF NOT EXISTS idx_summaries_created ON public.summaries(created_at);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(skill_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.skills SET view_count = view_count + 1, updated_at = NOW()
  WHERE id = skill_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment collect count
CREATE OR REPLACE FUNCTION increment_collect_count(skill_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.skills SET collect_count = collect_count + 1, updated_at = NOW()
  WHERE id = skill_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (but allow all for now, will restrict later)
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies (permissive for Phase 1)
CREATE POLICY "Allow all on skills" ON public.skills FOR ALL USING (true);
CREATE POLICY "Allow all on summaries" ON public.summaries FOR ALL USING (true);
CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true);
```

**Step 2: Commit**

```bash
git add scripts/setup-db.sql
git commit -m "feat: add database migration script"
```

---

## Phase 2: Extension Cloud Integration

### Task 2.1: Create Cloud API Client Library

**Files:**
- Create: `extension/lib/cloud.js`

**Step 1: Create cloud API wrapper**

```javascript
// extension/lib/cloud.js

const CLOUD_API_URL = 'https://skill-viewer-api.vercel.app';

export async function getCloudAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['cloudAuth'], (result) => {
      resolve(result.cloudAuth || null);
    });
  });
}

export async function setCloudAuth(auth) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ cloudAuth: auth }, resolve);
  });
}

export async function clearCloudAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['cloudAuth'], resolve);
  });
}

export async function cloudSummarize(repo, skillPath, skillName, skillContent, language) {
  const auth = await getCloudAuth();

  const headers = {
    'Content-Type': 'application/json'
  };

  if (auth?.accessToken) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`;
  }

  const response = await fetch(`${CLOUD_API_URL}/api/summarize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      repo,
      skillPath,
      skillName,
      skillContent,
      language
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 429) {
      return { error: 'quota_exceeded', message: error.message };
    }
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return await response.json();
}

export async function cloudGetUsage() {
  const auth = await getCloudAuth();
  if (!auth?.accessToken) {
    return null;
  }

  const response = await fetch(`${CLOUD_API_URL}/api/usage`, {
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return await response.json();
}
```

**Step 2: Commit**

```bash
git add extension/lib/cloud.js
git commit -m "feat: add cloud API client library"
```

---

### Task 2.2: Integrate Cloud API into Background.js

**Files:**
- Modify: `extension/background.js`

**Step 1: Add cloud summarize import and logic**

Add at the top of `background.js` after PROVIDERS definition:

```javascript
// Cloud API configuration
const CLOUD_API_URL = 'https://skill-viewer-api.vercel.app';

async function getCloudAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['cloudAuth'], (result) => {
      resolve(result.cloudAuth || null);
    });
  });
}

async function cloudSummarize(repo, skillPath, skillName, skillContent, language) {
  const auth = await getCloudAuth();

  const headers = { 'Content-Type': 'application/json' };
  if (auth?.accessToken) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`;
  }

  const response = await fetch(`${CLOUD_API_URL}/api/summarize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ repo, skillPath, skillName, skillContent, language })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 429) {
      return { error: 'quota_exceeded', message: error.message };
    }
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return await response.json();
}
```

**Step 2: Modify handleSummarize function**

Replace the `handleSummarize` function:

```javascript
async function handleSummarize(request) {
  const { skillName, skillContent, repo, skillPath } = request;

  const settings = await chrome.storage.local.get([
    'llmProvider',
    'providers',
    'summaryLanguage',
    'cloudAuth',
    'geminiApiKey'  // Legacy
  ]);

  const summaryLanguage = settings.summaryLanguage || 'en';

  // 1. Try cloud service first
  try {
    const cloudResult = await cloudSummarize(repo, skillPath, skillName, skillContent, summaryLanguage);

    if (cloudResult.error === 'quota_exceeded') {
      // Fall through to local
    } else if (cloudResult.summary) {
      return { summary: cloudResult.summary, cached: cloudResult.cached, source: 'cloud' };
    }
  } catch (err) {
    console.log('Cloud API failed, trying local:', err.message);
  }

  // 2. Fallback to local API key
  const provider = settings.llmProvider || 'gemini';

  let apiKey, model;
  if (settings.providers?.[provider]) {
    apiKey = settings.providers[provider].apiKey;
    model = settings.providers[provider].model || PROVIDERS[provider].defaultModel;
  } else if (provider === 'gemini' && settings.geminiApiKey) {
    apiKey = settings.geminiApiKey;
    model = PROVIDERS.gemini.defaultModel;
  }

  if (!apiKey) {
    return { error: 'No API key configured', fallback: true };
  }

  // Check local cache
  const cacheKey = `summary_${repo}_${skillName}_${summaryLanguage}`;
  const cached = await chrome.storage.local.get(cacheKey);

  if (cached[cacheKey]?.summary) {
    const age = Date.now() - cached[cacheKey].timestamp;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (age < ONE_DAY) {
      return { summary: cached[cacheKey].summary, cached: true, source: 'local' };
    }
  }

  try {
    const summary = await summarizeSkill(provider, apiKey, model, skillName, skillContent, summaryLanguage);

    await chrome.storage.local.set({
      [cacheKey]: { summary, timestamp: Date.now() }
    });

    return { summary, source: 'local' };
  } catch (err) {
    return { error: err.message, fallback: true };
  }
}
```

**Step 3: Commit**

```bash
git add extension/background.js
git commit -m "feat: integrate cloud API into background.js with local fallback"
```

---

## Phase 3: User Authentication

### Task 3.1: Create Usage API Endpoint

**Files:**
- Create: `api/usage.js`

**Step 1: Create usage endpoint**

```javascript
// api/usage.js
import { getSupabase, verifyToken } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req.headers.authorization);

    if (!user) {
      // Anonymous user
      return res.status(200).json({
        isPaid: false,
        dailyLimit: 5,
        dailyUsage: 0,
        authenticated: false
      });
    }

    const supabase = getSupabase();

    // Get or create user record
    let { data: userData } = await supabase
      .from('users')
      .select('is_paid, daily_usage, usage_reset_date')
      .eq('id', user.id)
      .single();

    if (!userData) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ id: user.id })
        .select('is_paid, daily_usage, usage_reset_date')
        .single();
      userData = newUser;
    }

    // Check if usage needs reset (new day)
    const today = new Date().toISOString().split('T')[0];
    if (userData.usage_reset_date !== today) {
      await supabase
        .from('users')
        .update({ daily_usage: 0, usage_reset_date: today })
        .eq('id', user.id);
      userData.daily_usage = 0;
    }

    const dailyLimit = userData.is_paid ? 50 : 5;

    // Calculate reset time (next midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return res.status(200).json({
      isPaid: userData.is_paid,
      dailyLimit,
      dailyUsage: userData.daily_usage,
      resetAt: tomorrow.toISOString(),
      authenticated: true
    });
  } catch (error) {
    console.error('Usage error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Step 2: Commit**

```bash
git add api/usage.js
git commit -m "feat: add /api/usage endpoint for quota status"
```

---

### Task 3.2: Add Quota Logic to Summarize API

**Files:**
- Modify: `api/summarize.js`
- Create: `lib/quota.js`

**Step 1: Create quota helper**

```javascript
// lib/quota.js
import { getSupabase } from './supabase.js';

const FREE_DAILY_LIMIT = 5;
const PAID_DAILY_LIMIT = 50;

export async function checkAndDeductQuota(userId) {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  // Get or create user record
  let { data: user } = await supabase
    .from('users')
    .select('is_paid, daily_usage, usage_reset_date')
    .eq('id', userId)
    .single();

  if (!user) {
    const { data: newUser } = await supabase
      .from('users')
      .insert({ id: userId, usage_reset_date: today })
      .select('is_paid, daily_usage, usage_reset_date')
      .single();
    user = newUser;
  }

  // Reset if new day
  if (user.usage_reset_date !== today) {
    user.daily_usage = 0;
    await supabase
      .from('users')
      .update({ daily_usage: 0, usage_reset_date: today })
      .eq('id', userId);
  }

  const limit = user.is_paid ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT;

  if (user.daily_usage >= limit) {
    return { allowed: false, usage: user.daily_usage, limit };
  }

  // Deduct quota
  await supabase
    .from('users')
    .update({ daily_usage: user.daily_usage + 1 })
    .eq('id', userId);

  return { allowed: true, usage: user.daily_usage + 1, limit };
}

export async function checkAnonymousQuota(ip) {
  // For anonymous users, we use a simple in-memory or DB approach
  // For simplicity, allow 5 requests without tracking (cloud caching handles abuse)
  return { allowed: true, usage: 0, limit: FREE_DAILY_LIMIT };
}
```

**Step 2: Update summarize.js to check quota**

Replace the handler in `api/summarize.js`:

```javascript
// api/summarize.js
import { getSupabase, verifyToken } from '../lib/supabase.js';
import { summarizeWithGemini } from '../lib/llm.js';
import { checkAndDeductQuota, checkAnonymousQuota } from '../lib/quota.js';

const CACHE_TTL_DAYS = 7;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repo, skillPath, skillName, skillContent, language = 'en' } = req.body;

    if (!repo || !skillPath || !skillName || !skillContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = getSupabase();

    // 1. Find or create skill record
    let { data: skill } = await supabase
      .from('skills')
      .select('id')
      .eq('repo', repo)
      .eq('skill_path', skillPath)
      .single();

    if (!skill) {
      const { data: newSkill, error } = await supabase
        .from('skills')
        .insert({ repo, skill_path: skillPath, skill_name: skillName })
        .select('id')
        .single();

      if (error) throw error;
      skill = newSkill;
    }

    // 2. Check for cached summary (BEFORE quota check - cache hits are free)
    const cacheThreshold = new Date();
    cacheThreshold.setDate(cacheThreshold.getDate() - CACHE_TTL_DAYS);

    const { data: cachedSummary } = await supabase
      .from('summaries')
      .select('summary')
      .eq('skill_id', skill.id)
      .eq('language', language)
      .gte('created_at', cacheThreshold.toISOString())
      .single();

    if (cachedSummary) {
      await supabase.rpc('increment_view_count', { skill_id: skill.id });
      return res.status(200).json({ summary: cachedSummary.summary, cached: true });
    }

    // 3. Check quota (only for cache misses)
    const user = await verifyToken(req.headers.authorization);
    let quotaResult;

    if (user) {
      quotaResult = await checkAndDeductQuota(user.id);
    } else {
      quotaResult = await checkAnonymousQuota(req.headers['x-forwarded-for'] || 'unknown');
    }

    if (!quotaResult.allowed) {
      return res.status(429).json({
        error: 'quota_exceeded',
        message: `Daily limit of ${quotaResult.limit} reached. ${user ? 'Upgrade to Pro for 50/day.' : 'Login for more requests.'}`
      });
    }

    // 4. Generate new summary
    const summary = await summarizeWithGemini(skillName, skillContent, language);

    // 5. Cache the summary
    await supabase
      .from('summaries')
      .upsert(
        { skill_id: skill.id, language, summary, created_at: new Date().toISOString() },
        { onConflict: 'skill_id,language' }
      );

    // 6. Update view count
    await supabase.rpc('increment_view_count', { skill_id: skill.id });

    return res.status(200).json({ summary, cached: false });
  } catch (error) {
    console.error('Summarize error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Step 3: Commit**

```bash
git add lib/quota.js api/summarize.js
git commit -m "feat: add quota checking to summarize API"
```

---

### Task 3.3: Add Cloud Service UI to Options Page

**Files:**
- Modify: `extension/options.html`
- Modify: `extension/options.js`

**Step 1: Add cloud service section to options.html**

Add before the LLM Provider section:

```html
<!-- Cloud Service Section -->
<div class="section">
  <h2 id="cloud-title">Cloud Service</h2>
  <div id="cloud-status" class="cloud-status">
    <div id="cloud-logged-out" class="cloud-state">
      <p id="cloud-login-prompt">Login to use cloud summarization</p>
      <div class="cloud-buttons">
        <button id="login-github" class="btn btn-secondary">Login with GitHub</button>
        <button id="login-google" class="btn btn-secondary">Login with Google</button>
      </div>
    </div>
    <div id="cloud-logged-in" class="cloud-state" style="display: none;">
      <p id="cloud-user-info"></p>
      <p id="cloud-usage-info"></p>
      <div class="cloud-buttons">
        <button id="upgrade-btn" class="btn btn-primary" style="display: none;">Upgrade to Pro</button>
        <button id="logout-btn" class="btn btn-secondary">Logout</button>
      </div>
    </div>
  </div>
</div>

<div class="divider"></div>
```

**Step 2: Add cloud service styles**

Add to the `<style>` section in options.html:

```css
.cloud-status {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 8px;
}

.cloud-state p {
  margin: 0 0 12px 0;
}

.cloud-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-secondary {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--text-secondary);
  color: white;
}
```

**Step 3: Add cloud service logic to options.js**

Add near the top of options.js:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const CLOUD_API_URL = 'https://skill-viewer-api.vercel.app';

async function initCloudUI() {
  const { cloudAuth } = await chrome.storage.local.get(['cloudAuth']);

  if (cloudAuth?.user) {
    showLoggedInState(cloudAuth);
    fetchUsage(cloudAuth.accessToken);
  } else {
    showLoggedOutState();
  }
}

function showLoggedOutState() {
  document.getElementById('cloud-logged-out').style.display = 'block';
  document.getElementById('cloud-logged-in').style.display = 'none';
}

function showLoggedInState(auth) {
  document.getElementById('cloud-logged-out').style.display = 'none';
  document.getElementById('cloud-logged-in').style.display = 'block';
  document.getElementById('cloud-user-info').textContent = `Logged in as ${auth.user.email}`;
}

async function fetchUsage(token) {
  try {
    const response = await fetch(`${CLOUD_API_URL}/api/usage`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    const remaining = data.dailyLimit - data.dailyUsage;
    const status = data.isPaid ? 'Pro' : 'Free';
    document.getElementById('cloud-usage-info').textContent =
      `${status}: ${remaining}/${data.dailyLimit} remaining today`;

    if (!data.isPaid) {
      document.getElementById('upgrade-btn').style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Failed to fetch usage:', err);
  }
}

// Add event listeners
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await chrome.storage.local.remove(['cloudAuth']);
  showLoggedOutState();
});

document.getElementById('upgrade-btn')?.addEventListener('click', () => {
  window.open('https://YOUR_LEMONSQUEEZY_URL', '_blank');
});

// Initialize cloud UI
initCloudUI();
```

**Step 4: Commit**

```bash
git add extension/options.html extension/options.js
git commit -m "feat: add cloud service UI to options page"
```

---

## Phase 4: Payment Integration

### Task 4.1: Create LemonSqueezy Webhook Handler

**Files:**
- Create: `api/webhook/lemonsqueezy.js`

**Step 1: Create webhook handler**

```javascript
// api/webhook/lemonsqueezy.js
import { getSupabase } from '../../lib/supabase.js';
import crypto from 'crypto';

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-signature'];
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('Missing LEMONSQUEEZY_WEBHOOK_SECRET');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);

    if (!verifySignature(rawBody, signature, secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventName = event.meta?.event_name;

    if (eventName === 'order_created') {
      const customData = event.meta?.custom_data || {};
      const userId = customData.user_id;
      const userEmail = event.data?.attributes?.user_email;
      const licenseKey = event.data?.attributes?.first_order_item?.product_name;

      if (!userId && !userEmail) {
        console.error('No user identifier in webhook');
        return res.status(400).json({ error: 'No user identifier' });
      }

      const supabase = getSupabase();

      // Find user by ID or email
      let query = supabase.from('users');
      if (userId) {
        query = query.eq('id', userId);
      } else {
        // Need to look up by email in auth.users
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(userEmail);
        if (authUser?.user) {
          query = query.eq('id', authUser.user.id);
        } else {
          console.error('User not found:', userEmail);
          return res.status(404).json({ error: 'User not found' });
        }
      }

      // Update user to paid
      const { error } = await query.update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        license_key: licenseKey || 'pro'
      });

      if (error) {
        console.error('Failed to update user:', error);
        return res.status(500).json({ error: 'Failed to update user' });
      }

      console.log('User upgraded to paid:', userId || userEmail);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Step 2: Commit**

```bash
git add api/webhook/lemonsqueezy.js
git commit -m "feat: add LemonSqueezy webhook handler"
```

---

### Task 4.2: Create Collect API Endpoint

**Files:**
- Create: `api/collect.js`

**Step 1: Create collect endpoint**

```javascript
// api/collect.js
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repo, skillPath } = req.body;

    if (!repo || !skillPath) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = getSupabase();

    // Find skill and increment collect count
    const { data: skill } = await supabase
      .from('skills')
      .select('id')
      .eq('repo', repo)
      .eq('skill_path', skillPath)
      .single();

    if (skill) {
      await supabase.rpc('increment_collect_count', { skill_id: skill.id });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Collect error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Step 2: Commit**

```bash
git add api/collect.js
git commit -m "feat: add /api/collect endpoint for tracking skill collections"
```

---

### Task 4.3: Integrate Collect Tracking into Extension

**Files:**
- Modify: `extension/content.js`

**Step 1: Add collect tracking to generateAndCopyCommand**

Find the `generateAndCopyCommand` function and add tracking call:

```javascript
function generateAndCopyCommand(skillName, skillPath, targetPath) {
  const { repoInfo, branch } = window.__skillViewerRepoInfo || {};

  if (!repoInfo) {
    showToast('Error: Repository info not available', true);
    return;
  }

  // Track collect event
  fetch('https://skill-viewer-api.vercel.app/api/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: repoInfo.full,
      skillPath: skillPath
    })
  }).catch(() => {}); // Fire and forget

  // Generate degit command
  const sourcePath = `${repoInfo.owner}/${repoInfo.repo}/${skillPath}#${branch}`;
  const destPath = `${targetPath}${skillName}`.replace(/^~(?=\/|$)/, '$HOME');
  const command = `npx degit "${sourcePath}" "${destPath}"`;

  navigator.clipboard.writeText(command).then(() => {
    showToast('Command copied, paste in terminal to execute');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy command', true);
  });
}
```

**Step 2: Commit**

```bash
git add extension/content.js
git commit -m "feat: track skill collection events"
```

---

## Phase 5: Final Integration & Testing

### Task 5.1: Update Extension Manifest for New Permissions

**Files:**
- Modify: `extension/manifest.json`

**Step 1: Add new host permission**

Add to the `host_permissions` array:

```json
"host_permissions": [
  "https://api.github.com/*",
  "https://raw.githubusercontent.com/*",
  "https://generativelanguage.googleapis.com/*",
  "https://api.openai.com/*",
  "https://api.anthropic.com/*",
  "https://skill-viewer-api.vercel.app/*"
]
```

**Step 2: Commit**

```bash
git add extension/manifest.json
git commit -m "feat: add cloud API host permission to manifest"
```

---

### Task 5.2: Add i18n Strings for Cloud UI

**Files:**
- Modify: `extension/lib/i18n.js`

**Step 1: Add cloud service translations**

Add to the `translations` object for each language:

```javascript
// Add these keys to each language
cloudService: "Cloud Service",
cloudLoginPrompt: "Login to use cloud summarization",
loginWithGithub: "Login with GitHub",
loginWithGoogle: "Login with Google",
loggedInAs: "Logged in as",
upgradeToPro: "Upgrade to Pro",
logout: "Logout",
remainingToday: "remaining today",
quotaExceeded: "Daily limit reached",
```

**Step 2: Commit**

```bash
git add extension/lib/i18n.js
git commit -m "feat: add i18n strings for cloud service UI"
```

---

### Task 5.3: Create README for API Deployment

**Files:**
- Create: `API_DEPLOYMENT.md`

**Step 1: Create deployment documentation**

```markdown
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
```

**Step 2: Commit**

```bash
git add API_DEPLOYMENT.md
git commit -m "docs: add API deployment guide"
```

---

## Summary

**Phase 1** - Project setup, Supabase client, LLM library, basic summarize API
**Phase 2** - Extension cloud client, background.js integration
**Phase 3** - Usage API, quota system, options page cloud UI
**Phase 4** - LemonSqueezy webhook, collect tracking
**Phase 5** - Manifest updates, i18n, deployment docs

**Total commits:** ~15 focused commits
**Test after each phase** to ensure incremental progress works.
