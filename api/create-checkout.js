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
