// api/collect.js
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repo, skillPath } = req.body;

    if (!repo || !skillPath) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = getSupabase();

    // Find skill and increment collect count
    const { data: skill } = await supabase
      .from('skills')
      .select('id')
      .eq('repo', repo)
      .eq('skill_path', skillPath)
      .single();

    if (skill) {
      await supabase.rpc('increment_collect_count', { skill_id: skill.id });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Collect error:', error);
    return res.status(500).json({ error: error.message });
  }
}
