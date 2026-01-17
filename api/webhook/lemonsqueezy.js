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
