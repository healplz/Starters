/**
 * One-time script to seed Vercel KV (Upstash Redis) with questions from
 * the local JSON file.
 *
 * Setup:
 *   1. In Vercel dashboard → Integrations → find Upstash Redis and connect it
 *      to your project (or add via Vercel Marketplace → search "Upstash Redis")
 *   2. Run `vercel env pull .env.local` to pull the KV env vars locally
 *   3. Run this script: `node scripts/seed-kv.mjs`
 *
 * Note: @vercel/kv is deprecated but still functional for Upstash Redis stores
 * connected via Vercel Integrations.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@vercel/kv'

const __dirname = dirname(fileURLToPath(import.meta.url))

const {
  KV_REST_API_URL,
  KV_REST_API_TOKEN,
} = process.env

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  console.error('Missing KV env vars. Run: vercel env pull .env.local')
  process.exit(1)
}

const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
})

const dataPath = join(__dirname, '../src/data/table-topics.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

console.log(`Seeding ${data.categories.length} categories...`)
await kv.set('table-topics', data)
console.log('Done. KV seeded successfully.')
