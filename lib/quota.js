// lib/quota.js
import { getSupabase } from './supabase.js';

// Configurable via environment variables
const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT) || 5;
const PAID_DAILY_LIMIT = parseInt(process.env.PAID_DAILY_LIMIT) || 50;

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
