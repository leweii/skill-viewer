// api/check-order.js
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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabase();

    // 查询用户支付状态
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_paid, paid_at')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to get user status:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!userData) {
      return res.status(200).json({ status: 'pending' });
    }

    if (userData.is_paid) {
      return res.status(200).json({
        status: 'paid',
        paidAt: userData.paid_at
      });
    }

    return res.status(200).json({ status: 'pending' });
  } catch (error) {
    console.error('Check order error:', error);
    return res.status(500).json({ error: error.message });
  }
}
