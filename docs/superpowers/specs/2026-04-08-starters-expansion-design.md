# Starters Expansion: Admin UI + PWA

**Date:** 2026-04-08

## Problem

Questions are stored in a static JSON file and managed via an offline CSV import script. Adding or editing questions requires file editing and a manual process — cumbersome for a live tool used in team meetings at https://starters.kazlo.dev.

## Goal

- In-app admin UI for managing questions (add, edit, delete) and categories
- Questions stored in Vercel KV so changes persist across deployments
- Admin protected by a passphrase (public Vercel deployment)
- PWA manifest so the app is installable from the browser

## Architecture

### Data Storage

Questions move from `src/data/table-topics.json` into Vercel KV as a single JSON blob under the key `table-topics`. The shape is identical to the existing file:

```json
{ "categories": [{ "name": "...", "questions": ["..."] }] }
```

`src/data/table-topics.json` is kept as the seed source and fallback (if KV returns null).

### Data Layer

`src/lib/table-topics.ts` gains two async functions:
- `getCategories()` — fetches from KV, falls back to JSON
- `saveCategories(data)` — writes back to KV

### Main Page

`src/app/page.tsx` becomes an async server component that calls `getCategories()` and passes the result to a new client component `src/app/_components/CardDeck.tsx` (which contains all existing `useState`/`useCallback` logic).

### Admin UI

Route: `/admin`
Layout: sidebar (categories + counts) + right panel (questions for selected category)
Category selection: `?cat=CategoryName` URL search param

Features:
- Add question to a category
- Edit question inline (pencil → input)
- Delete question
- Add new category

### Auth

Simple passphrase stored as `ADMIN_PASSPHRASE` env variable.

Flow:
1. `middleware.ts` guards `/admin/**` (except `/admin/login`)
2. Checks for `admin_session` cookie; missing → redirect to `/admin/login`
3. Login page submits passphrase via Server Action
4. On match: sets `HttpOnly` cookie, redirects to `/admin`

No JWT signing. Cookie value is a sentinel (`1`). Passphrase never reaches the client.

### API Routes

- `GET /api/questions` — fetch all categories
- `POST /api/questions` — add question `{ category, question }`
- `PUT /api/questions/[category]` — edit question `{ oldQuestion, newQuestion }`
- `DELETE /api/questions/[category]` — remove question `{ question }`
- `POST /api/categories` — add category `{ name }`

All mutations call `revalidatePath('/')` so the main deck reflects changes immediately.

### PWA

`public/manifest.json` with name, icons (existing `icon.svg`), dark theme color. Added to layout metadata via Next.js 16 metadata API.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/table-topics.ts` | Add async KV functions |
| `src/app/page.tsx` | Convert to async server component |
| `src/app/_components/CardDeck.tsx` | New — extracted client component |
| `src/app/admin/page.tsx` | New — admin server component |
| `src/app/admin/_components/AdminPanel.tsx` | New — admin client component |
| `src/app/admin/login/page.tsx` | New — login form |
| `src/app/actions/auth.ts` | New — Server Action for login |
| `src/app/api/questions/route.ts` | New |
| `src/app/api/questions/[category]/route.ts` | New |
| `src/app/api/categories/route.ts` | New |
| `middleware.ts` | New — admin route guard |
| `public/manifest.json` | New |
| `src/app/layout.tsx` | Add manifest to metadata |
| `scripts/seed-kv.mjs` | New — one-time KV seed |
| `.gitignore` | Add `.superpowers/` |

## Verification

1. App loads, card draw still works
2. Visit `/admin` → redirected to `/admin/login`
3. Wrong passphrase → error shown
4. Correct passphrase → cookie set, redirected to `/admin`
5. Add question in admin → appears in deck on main page
6. Edit question → persists after reload
7. Delete question → gone from main page
8. Add category → appears in category filter pills
9. Chrome install prompt appears (PWA)
10. `npm run build` passes
