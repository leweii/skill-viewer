import pg from 'pg'
const { Pool } = pg

let pool = null

export function getDb() {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('Missing DATABASE_URL')
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
  }
  return pool
}
