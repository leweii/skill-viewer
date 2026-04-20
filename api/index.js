// api/index.js
export default async function handler(req, res) {
  try {
    const status = {
      service: 'Skill Viewer API',
      timestamp: new Date().toISOString(),
      env: {},
      connections: {},
    }

    const envVars = ['DATABASE_URL', 'GEMINI_API_KEY']
    for (const key of envVars) {
      status.env[key] = process.env[key] ? '✓ configured' : '✗ missing'
    }

    // Test DB connection
    if (process.env.DATABASE_URL) {
      try {
        const { getDb } = await import('../lib/db.js')
        const db = getDb()
        await db.query('SELECT 1')
        status.connections.database = '✓ connected'
      } catch (err) {
        status.connections.database = `✗ failed: ${err.message}`
      }
    } else {
      status.connections.database = '✗ env var missing'
    }

    status.connections.gemini = process.env.GEMINI_API_KEY ? '✓ key configured' : '✗ key missing'

    const acceptHeader = req.headers.accept || ''
    if (acceptHeader.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.status(200).send(renderHTML(status))
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.status(200).json(status)
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

function renderHTML(status) {
  const envRows = Object.entries(status.env).map(([key, value]) => `
    <tr><td><code>${key}</code></td><td class="${value.includes('✓') ? 'ok' : 'err'}">${value}</td></tr>
  `).join('')

  const connRows = Object.entries(status.connections).map(([key, value]) => `
    <tr><td><code>${key}</code></td><td class="${value.includes('✓') ? 'ok' : 'err'}">${value}</td></tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill Viewer API Status</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #0d1117; color: #c9d1d9; }
    h1 { color: #58a6ff; margin-bottom: 0.5rem; }
    .timestamp { color: #8b949e; font-size: 0.9rem; margin-bottom: 2rem; }
    h2 { color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #30363d; }
    th { color: #8b949e; font-weight: 500; }
    code { background: #161b22; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9rem; }
    .ok { color: #3fb950; } .err { color: #f85149; }
    .endpoints { list-style: none; padding: 0; }
    .endpoints li { padding: 0.5rem 0; }
    .endpoints code { color: #58a6ff; }
    .method { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-right: 0.5rem; }
    .method.post { background: #1f6feb; color: white; }
  </style>
</head>
<body>
  <h1>Skill Viewer API</h1>
  <p class="timestamp">Status as of ${status.timestamp}</p>
  <h2>Environment Variables</h2>
  <table><thead><tr><th>Variable</th><th>Status</th></tr></thead><tbody>${envRows}</tbody></table>
  <h2>Connections</h2>
  <table><thead><tr><th>Service</th><th>Status</th></tr></thead><tbody>${connRows}</tbody></table>
  <h2>API Endpoints</h2>
  <ul class="endpoints">
    <li><span class="method post">POST</span><code>/api/summarize</code> - Generate skill summary</li>
    <li><span class="method post">POST</span><code>/api/collect</code> - Track skill collection</li>
  </ul>
</body>
</html>`
}
