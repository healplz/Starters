# Starters

A work-appropriate conversation starter card app. Draw a random question from a curated deck of 497 questions across 10 categories, or filter the deck to only the categories you want.

## Features

- **Card draw** — displays a random question on each draw, styled as a clean white portrait card (Helvetica Neue Bold, left-aligned)
- **Category filtering** — multi-select category pills let you build a custom deck by including or excluding categories
- **497 questions** across 10 categories: Funny, Thought-Provoking, Personal, Would You Rather, Family-Friendly, Work & Team Building, Creative Thinking, This or That, Imaginative, and Random & Fun

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

## Data

Questions live in `src/data/table-topics.json` and are accessed via `src/lib/table-topics.ts`. To re-scrape or extend the question set, run the scripts in `scripts/`:

```bash
# Re-scrape from source
node scripts/scrape-table-topics.mjs

# Add the extended question set
node scripts/extend-questions.mjs
```

## Deploying

Deployed on [Vercel](https://vercel.com) — import the repo and it works out of the box.
