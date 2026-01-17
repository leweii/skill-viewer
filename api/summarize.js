// api/summarize.js
import { getSupabase } from '../lib/supabase.js';
import { summarizeWithGemini } from '../lib/llm.js';

const CACHE_TTL_DAYS = 7;

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

    // 2. Check for cached summary
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
      // Update view count
      await supabase.rpc('increment_view_count', { skill_id: skill.id });
      return res.status(200).json({ summary: cachedSummary.summary, cached: true });
    }

    // 3. Generate new summary
    const summary = await summarizeWithGemini(skillName, skillContent, language);

    // 4. Cache the summary (upsert)
    await supabase
      .from('summaries')
      .upsert(
        { skill_id: skill.id, language, summary, created_at: new Date().toISOString() },
        { onConflict: 'skill_id,language' }
      );

    // 5. Update view count
    await supabase.rpc('increment_view_count', { skill_id: skill.id });

    return res.status(200).json({ summary, cached: false });
  } catch (error) {
    console.error('Summarize error:', error);
    return res.status(500).json({ error: error.message });
  }
}
