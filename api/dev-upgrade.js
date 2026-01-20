// api/dev-upgrade.js
// DEV ONLY: Skip payment and set user as Pro
// This should be disabled or protected in production!

import { getSupabase, verifyToken } from '../lib/supabase.js';

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

  // Check if dev mode is enabled (via environment variable)
  const devModeEnabled = process.env.DEV_MODE === 'true' || process.env.VERCEL_ENV !== 'production';

  if (!devModeEnabled) {
    return res.status(403).json({ error: 'Dev mode not enabled' });
  }

  try {
    const user = await verifyToken(req.headers.authorization);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabase();

    // Update user to Pro
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        is_paid: true,
        paid_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Dev upgrade error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[DEV] User ${user.id} upgraded to Pro`);

    return res.status(200).json({
      success: true,
      message: 'Account upgraded to Pro (dev mode)'
    });

  } catch (error) {
    console.error('Dev upgrade error:', error);
    return res.status(500).json({ error: error.message });
  }
}
