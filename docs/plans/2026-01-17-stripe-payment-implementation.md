# Stripe Payment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace LemonSqueezy with Stripe for payments (credit cards, Alipay, WeChat Pay).

**Architecture:** Create checkout session API → Stripe hosted checkout → Webhook updates Supabase.

**Tech Stack:** Stripe API, Vercel Serverless, Supabase

---

## Task 1: Add Stripe Dependency

**Files:**
- Modify: `package.json`

**Step 1: Add stripe package**

Add to dependencies:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "stripe": "^14.0.0"
  }
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add stripe dependency"
```

---

## Task 2: Update Environment Variables

**Files:**
- Modify: `.env.example`

**Step 1: Replace LemonSqueezy with Stripe vars**

Change from:
```
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
```

To:
```
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: update env vars for Stripe"
```

---

## Task 3: Create Checkout Session API

**Files:**
- Create: `api/create-checkout.js`

**Step 1: Create the endpoint**

```javascript
// api/create-checkout.js
import Stripe from 'stripe';
import { verifyToken } from '../lib/supabase.js';

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
    // Verify user is logged in
    const user = await verifyToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { successUrl, cancelUrl } = req.body;
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing successUrl or cancelUrl' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'alipay', 'wechat_pay'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }],
      metadata: {
        user_id: user.id
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_options: {
        wechat_pay: {
          client: 'web'
        }
      }
    });

    return res.status(200).json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Step 2: Commit**

```bash
git add api/create-checkout.js
git commit -m "feat: add Stripe checkout session API"
```

---

## Task 4: Create Stripe Webhook Handler

**Files:**
- Create: `api/webhook/stripe.js`

**Step 1: Create the webhook handler**

```javascript
// api/webhook/stripe.js
import Stripe from 'stripe';
import { getSupabase } from '../../lib/supabase.js';

export const config = {
  api: {
    bodyParser: false
  }
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;

      if (!userId) {
        console.error('No user_id in session metadata');
        return res.status(400).json({ error: 'No user identifier' });
      }

      const supabase = getSupabase();

      const { error } = await supabase
        .from('users')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          license_key: session.payment_intent || 'stripe_pro'
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update user:', error);
        return res.status(500).json({ error: 'Failed to update user' });
      }

      console.log('User upgraded to paid:', userId);
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
git add api/webhook/stripe.js
git commit -m "feat: add Stripe webhook handler"
```

---

## Task 5: Delete LemonSqueezy Webhook

**Files:**
- Delete: `api/webhook/lemonsqueezy.js`

**Step 1: Remove the file**

```bash
rm api/webhook/lemonsqueezy.js
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove LemonSqueezy webhook handler"
```

---

## Task 6: Update Extension Options.js

**Files:**
- Modify: `extension/options.js`

**Step 1: Update upgrade button handler**

Replace the existing upgrade handler:

```javascript
document.getElementById('upgrade-btn')?.addEventListener('click', () => {
  window.open('https://YOUR_LEMONSQUEEZY_URL', '_blank');
});
```

With:

```javascript
document.getElementById('upgrade-btn')?.addEventListener('click', async () => {
  const auth = await chrome.storage.local.get('cloudAuth');
  if (!auth.cloudAuth?.accessToken) {
    alert('Please login first to upgrade');
    return;
  }

  try {
    const response = await fetch('https://skill-viewer-api.vercel.app/api/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.cloudAuth.accessToken}`
      },
      body: JSON.stringify({
        successUrl: chrome.runtime.getURL('options.html?upgraded=true'),
        cancelUrl: chrome.runtime.getURL('options.html?cancelled=true')
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { checkoutUrl } = await response.json();
    window.open(checkoutUrl, '_blank');
  } catch (error) {
    console.error('Upgrade error:', error);
    alert('Failed to start checkout. Please try again.');
  }
});
```

**Step 2: Add URL parameter handling for post-payment**

Add after DOMContentLoaded or at the end of the file:

```javascript
// Handle post-payment URL parameters
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('upgraded') === 'true') {
  // Refresh cloud UI to show new status
  initCloudUI();
  alert('Payment successful! You are now a Pro user.');
  // Clean up URL
  window.history.replaceState({}, document.title, window.location.pathname);
} else if (urlParams.get('cancelled') === 'true') {
  alert('Payment was cancelled.');
  window.history.replaceState({}, document.title, window.location.pathname);
}
```

**Step 3: Commit**

```bash
git add extension/options.js
git commit -m "feat: update upgrade button for Stripe checkout"
```

---

## Task 7: Update API Deployment Docs

**Files:**
- Modify: `API_DEPLOYMENT.md`

**Step 1: Replace LemonSqueezy section with Stripe**

Replace the LemonSqueezy Setup section with:

```markdown
## Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Create a product "Skill Viewer Pro" with one-time payment ($9.99)
3. Enable payment methods in Dashboard → Settings → Payment methods:
   - Cards (enabled by default)
   - Alipay
   - WeChat Pay
4. Create webhook endpoint:
   - URL: `https://your-vercel-app.vercel.app/api/webhook/stripe`
   - Events: `checkout.session.completed`
5. Copy the webhook signing secret

Note: Alipay and WeChat Pay require account activation and may need business verification.
```

Also update the environment variables section to show:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`

Instead of `LEMONSQUEEZY_WEBHOOK_SECRET`.

**Step 2: Commit**

```bash
git add API_DEPLOYMENT.md
git commit -m "docs: update deployment guide for Stripe"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add Stripe dependency | package.json |
| 2 | Update env vars | .env.example |
| 3 | Create checkout API | api/create-checkout.js |
| 4 | Create Stripe webhook | api/webhook/stripe.js |
| 5 | Delete LemonSqueezy webhook | api/webhook/lemonsqueezy.js |
| 6 | Update extension options | extension/options.js |
| 7 | Update deployment docs | API_DEPLOYMENT.md |

**Total: 7 tasks, ~7 commits**
