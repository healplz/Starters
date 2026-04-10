# Starters

A work-appropriate conversation starter card app. Draw a random question from a curated deck of 497 questions across 10 categories, or filter the deck to only the categories you want.

## Features

- **Card draw** — displays a random question on each draw, styled as a clean white portrait card (Helvetica Neue Bold, left-aligned)
- **Category filtering** — multi-select category pills let you build a custom deck by including or excluding categories
- **Admin UI** — manage questions and categories at `/admin` (passphrase-protected)
- **PWA** — installable from Chrome/Edge with one click

## Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Admin

Visit `/admin` to manage questions and categories. You'll be prompted for a passphrase.

Set it as an environment variable before deploying:

```bash
ADMIN_PASSPHRASE=your-secret-here
```

## Storage (Vercel KV / Upstash Redis)

Questions are stored in Vercel KV (Upstash Redis). Without KV configured, the app falls back to the local `src/data/table-topics.json` file.

### Setup

1. In the Vercel dashboard, go to **Integrations → Marketplace** and add **Upstash Redis** to your project
2. Pull env vars locally: `vercel env pull .env.local`
3. Seed the initial questions: `node scripts/seed-kv.mjs`

Required env vars:
```
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

## Adding Questions in Bulk

To bulk-import questions from a CSV file (falls back to local JSON):

```bash
node scripts/import-csv.mjs ./new-questions.csv
node scripts/seed-kv.mjs  # re-seed KV after import
```

CSV format:
```csv
category,question
Funny,Why did you take this job?
Personal,What's the best advice you've ever received?
```

## Deploying

Deployed on [Vercel](https://vercel.com) — import the repo, set `ADMIN_PASSPHRASE`, connect Upstash Redis, and run the seed script.
