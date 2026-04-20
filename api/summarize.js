import { getDb } from '../lib/db.js'
import { summarizeWithGemini } from '../lib/llm.js'

const CACHE_TTL_DAYS = 7

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { repo, skillPath, skillName, skillContent, language = 'en' } = req.body

    if (!repo || !skillPath || !skillName || !skillContent) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const db = getDb()

    // Find or create skill record
    const upsertSkill = await db.query(
      `INSERT INTO skills (repo, skill_path, skill_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (repo, skill_path) DO UPDATE SET skill_name = EXCLUDED.skill_name
       RETURNING id`,
      [repo, skillPath, skillName]
    )
    const skillId = upsertSkill.rows[0].id

    // Check cache
    const cacheThreshold = new Date()
    cacheThreshold.setDate(cacheThreshold.getDate() - CACHE_TTL_DAYS)

    const cached = await db.query(
      `SELECT summary FROM summaries
       WHERE skill_id = $1 AND language = $2 AND created_at >= $3`,
      [skillId, language, cacheThreshold.toISOString()]
    )

    if (cached.rows.length > 0) {
      db.query('UPDATE skills SET view_count = view_count + 1 WHERE id = $1', [skillId])
      return res.status(200).json({ summary: cached.rows[0].summary, cached: true })
    }

    // Generate summary
    const summary = await summarizeWithGemini(skillName, skillContent, language)

    // Cache it
    await db.query(
      `INSERT INTO summaries (skill_id, language, summary)
       VALUES ($1, $2, $3)
       ON CONFLICT (skill_id, language) DO UPDATE SET summary = EXCLUDED.summary, created_at = NOW()`,
      [skillId, language, summary]
    )

    db.query('UPDATE skills SET view_count = view_count + 1 WHERE id = $1', [skillId])

    return res.status(200).json({ summary, cached: false })
  } catch (error) {
    console.error('Summarize error:', error)
    return res.status(500).json({ error: error.message })
  }
}
