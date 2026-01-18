// api/check-order.js
import { verifyToken, getSupabase } from '../lib/supabase.js';

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

    // 检查用户是否已付费
    const supabase = getSupabase();
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_paid')
      .eq('id', user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to check status' });
    }

    return res.status(200).json({
      status: userData?.is_paid ? 'paid' : 'pending'
    });
  } catch (error) {
    console.error('Check order error:', error);
    return res.status(500).json({ error: error.message });
  }
}
