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

## Adding Questions

Questions live in `src/data/table-topics.json`. To add questions in bulk, prepare a CSV with `category` and `question` columns and run:

```bash
node scripts/import-csv.mjs ./new-questions.csv
```

Example CSV:
```csv
category,question
Funny,Why did you take this job?
Personal,What's the best advice you've ever received?
```

The script merges into existing categories (case-insensitive match), creates new categories as needed, and skips duplicates.

## Deploying

Deployed on [Vercel](https://vercel.com) — import the repo and it works out of the box.
