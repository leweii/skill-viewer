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
