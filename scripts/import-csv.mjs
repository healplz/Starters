#!/usr/bin/env node
/**
 * Import questions from a CSV file into src/data/table-topics.json
 *
 * CSV format (header row required):
 *   category,question
 *   Funny,Why did you take this job?
 *   Personal,What's the best advice you've ever received?
 *
 * Usage:
 *   node scripts/import-csv.mjs ./new-questions.csv
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.join(__dirname, '../src/data/table-topics.json')

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/import-csv.mjs <path-to-csv>')
  process.exit(1)
}

const csvAbsolute = path.resolve(csvPath)
if (!fs.existsSync(csvAbsolute)) {
  console.error(`File not found: ${csvAbsolute}`)
  process.exit(1)
}

// Parse CSV — handles quoted fields with commas inside
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  return lines.map(line => {
    const fields = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    fields.push(current.trim())
    return fields
  })
}

const csvText = fs.readFileSync(csvAbsolute, 'utf-8')
const rows = parseCSV(csvText)

// Validate header
const [header, ...dataRows] = rows
const categoryCol = header.findIndex(h => h.toLowerCase() === 'category')
const questionCol = header.findIndex(h => h.toLowerCase() === 'question')

if (categoryCol === -1 || questionCol === -1) {
  console.error('CSV must have "category" and "question" header columns')
  process.exit(1)
}

// Load existing data
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))

let added = 0
let skipped = 0

for (const row of dataRows) {
  if (row.length < 2) continue
  const categoryName = row[categoryCol]?.trim()
  const question = row[questionCol]?.trim()
  if (!categoryName || !question) continue

  // Find or create category (case-insensitive match)
  let category = data.categories.find(
    c => c.name.toLowerCase() === categoryName.toLowerCase()
  )
  if (!category) {
    category = { name: categoryName, questions: [] }
    data.categories.push(category)
  }

  // Deduplicate
  const normalized = question.toLowerCase().replace(/[^a-z0-9]/g, '')
  const isDuplicate = category.questions.some(
    q => q.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
  )

  if (isDuplicate) {
    skipped++
  } else {
    category.questions.push(question)
    added++
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n')

console.log(`Done: ${added} question(s) added, ${skipped} duplicate(s) skipped.`)
