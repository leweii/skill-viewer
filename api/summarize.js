// api/summarize.js
import { getSupabase, verifyToken } from '../lib/supabase.js';
import { summarizeWithGemini } from '../lib/llm.js';
import { checkAndDeductQuota, checkAnonymousQuota } from '../lib/quota.js';

const CACHE_TTL_DAYS = 7;

export default async function handler(req, res) {
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
    const { repo, skillPath, skillName, skillContent, language = 'en' } = req.body;

    if (!repo || !skillPath || !skillName || !skillContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = getSupabase();

    // 1. Find or create skill record
    let { data: skill } = await supabase
      .from('skills')
      .select('id')
      .eq('repo', repo)
      .eq('skill_path', skillPath)
      .single();

    if (!skill) {
      const { data: newSkill, error } = await supabase
        .from('skills')
        .insert({ repo, skill_path: skillPath, skill_name: skillName })
        .select('id')
        .single();

      if (error) throw error;
      skill = newSkill;
    }

    // 2. Check for cached summary (BEFORE quota check - cache hits are free)
    const cacheThreshold = new Date();
    cacheThreshold.setDate(cacheThreshold.getDate() - CACHE_TTL_DAYS);

    const { data: cachedSummary } = await supabase
      .from('summaries')
      .select('summary')
      .eq('skill_id', skill.id)
      .eq('language', language)
      .gte('created_at', cacheThreshold.toISOString())
      .single();

    if (cachedSummary) {
      await supabase.rpc('increment_view_count', { skill_id: skill.id });
      return res.status(200).json({ summary: cachedSummary.summary, cached: true });
    }

    // 3. Check quota (only for cache misses)
    const user = await verifyToken(req.headers.authorization);
    let quotaResult;

    if (user) {
      quotaResult = await checkAndDeductQuota(user.id);
    } else {
      quotaResult = await checkAnonymousQuota(req.headers['x-forwarded-for'] || 'unknown');
    }

    if (!quotaResult.allowed) {
      return res.status(429).json({
        error: 'quota_exceeded',
        message: `Daily limit of ${quotaResult.limit} reached. ${user ? 'Upgrade to Pro for 50/day.' : 'Login for more requests.'}`
      });
    }

    // 4. Generate new summary
    const summary = await summarizeWithGemini(skillName, skillContent, language);

    // 5. Cache the summary
    await supabase
      .from('summaries')
      .upsert(
        { skill_id: skill.id, language, summary, created_at: new Date().toISOString() },
        { onConflict: 'skill_id,language' }
      );

    // 6. Update view count
    await supabase.rpc('increment_view_count', { skill_id: skill.id });

    return res.status(200).json({ summary, cached: false });
  } catch (error) {
    console.error('Summarize error:', error);
    return res.status(500).json({ error: error.message });
  }
}
