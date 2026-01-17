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
