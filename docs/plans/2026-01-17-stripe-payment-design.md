# Stripe Payment Integration Design

Date: 2026-01-17

## Overview

Replace LemonSqueezy with Stripe for payment processing. Stripe provides a single integration for:
- Credit cards (global)
- Alipay (China)
- WeChat Pay (China)

## Architecture

**Payment Flow:**
```
User (logged in) → Create Checkout Session (with user_id) → Stripe Checkout → Webhook → Update Supabase
```

**Key Components:**
- `api/create-checkout.js` - Creates Stripe Checkout session with user metadata
- `api/webhook/stripe.js` - Handles payment completion webhook
- Extension options.js - Calls API to initiate checkout

## API Design

### POST /api/create-checkout

Creates a Stripe Checkout session for the logged-in user.

**Request:**
```json
{
  "successUrl": "chrome-extension://xxx/options.html?upgraded=true",
  "cancelUrl": "chrome-extension://xxx/options.html?cancelled=true"
}
```

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_xxx..."
}
```

**Processing:**
1. Verify Supabase token → get user_id
2. Create Stripe Checkout Session:
   - `mode: 'payment'` (one-time)
   - `metadata: { user_id }`
   - `payment_method_types: ['card', 'alipay', 'wechat_pay']`
   - Price ID from `STRIPE_PRICE_ID` env var
3. Return checkout URL

### POST /api/webhook/stripe

Handles Stripe webhook events.

**Processing:**
1. Verify Stripe signature using `STRIPE_WEBHOOK_SECRET`
2. Handle `checkout.session.completed` event
3. Extract `user_id` from `session.metadata`
4. Update Supabase: `is_paid = true`, `paid_at = NOW()`

## Extension Changes

### options.js Upgrade Handler

```javascript
document.getElementById('upgrade-btn')?.addEventListener('click', async () => {
  const auth = await chrome.storage.local.get('cloudAuth');
  if (!auth.cloudAuth?.accessToken) {
    alert('Please login first');
    return;
  }

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

  const { checkoutUrl } = await response.json();
  window.open(checkoutUrl, '_blank');
});
```

### Post-Payment UX

- On `?upgraded=true`: Show success message, refresh usage status
- On `?cancelled=true`: Show "Payment cancelled" message

## Environment Variables

**Remove:**
```
LEMONSQUEEZY_WEBHOOK_SECRET
```

**Add:**
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx
```

## Stripe Dashboard Setup

1. **Create Product:**
   - Name: "Skill Viewer Pro"
   - One-time payment: $9.99

2. **Enable Payment Methods:**
   - Settings → Payment methods → Enable:
     - Cards
     - Alipay
     - WeChat Pay

3. **Create Webhook Endpoint:**
   - URL: `https://skill-viewer-api.vercel.app/api/webhook/stripe`
   - Events: `checkout.session.completed`

4. **Alipay/WeChat Notes:**
   - Requires Stripe account activation for these methods
   - WeChat Pay may require business verification

## Files to Change

### Delete:
- `api/webhook/lemonsqueezy.js`

### Create:
- `api/create-checkout.js`
- `api/webhook/stripe.js`

### Modify:
- `extension/options.js` - Upgrade button handler
- `.env.example` - Update env vars
- `API_DEPLOYMENT.md` - Stripe setup docs
- `package.json` - Add `stripe` dependency

## Security

- Require login before upgrade (user_id in metadata)
- Verify Stripe webhook signatures
- Never expose secret key to client
