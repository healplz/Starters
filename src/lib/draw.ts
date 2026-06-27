import type { Category } from '@/lib/table-topics'

export type CardData = { question: string; categoryName: string }

export function questionKey(card: CardData): string {
  return `${card.categoryName}::${card.question}`
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Pick a random question, excluding used questions and preferring unseen/fresh ones. */
export function drawFrom(
  categories: Category[],
  activeCats: Set<string>,
  usedQuestions: Set<string>,
  previousCard: CardData | null,
  history?: CardData[],
): CardData | null {
  const pool = categories.filter((c) => activeCats.has(c.name))

  // Gather all eligible questions with weights
  interface Weighted { data: CardData; weight: number }
  const weighted: Weighted[] = []
  const historySet = new Set(history?.map(questionKey) ?? [])
  const prevKey = previousCard ? questionKey(previousCard) : null

  for (const cat of pool) {
    for (const q of cat.questions) {
      const key = `${cat.name}::${q}`
      if (usedQuestions.has(key)) continue

      // Weighting:
      //   - Never seen in this session: 1.0
      //   - In history (drawn but not used): 0.3
      //   - Same as the very last card: 0.1
      let weight = historySet.has(key) ? 0.3 : 1.0
      if (prevKey === key) weight = 0.1

      weighted.push({ data: { question: q, categoryName: cat.name }, weight })
    }
  }

  if (weighted.length === 0) return null

  // Weighted random selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0)
  let random = Math.random() * totalWeight
  for (const entry of weighted) {
    random -= entry.weight
    if (random <= 0) return entry.data
  }

  // Fallback (shouldn't happen)
  return weighted[weighted.length - 1].data
}

/** Return a copy of `used` with all question keys of the active categories removed,
 *  so those questions become drawable again (used to "reshuffle" an exhausted deck). */
export function pruneUsedForActive(
  used: Set<string>,
  activeCats: Set<string>,
  categories: Category[],
): Set<string> {
  const activeKeys = new Set<string>()
  for (const c of categories) {
    if (activeCats.has(c.name)) {
      for (const q of c.questions) activeKeys.add(`${c.name}::${q}`)
    }
  }
  const next = new Set<string>()
  for (const k of used) if (!activeKeys.has(k)) next.add(k)
  return next
}