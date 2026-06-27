import { describe, test, expect } from '@jest/globals'
import { drawFrom, pruneUsedForActive } from './draw'
import type { Category } from './table-topics'
import type { CardData } from './draw'

const cats: Category[] = [
  { name: 'A', questions: ['a1', 'a2'] },
  { name: 'B', questions: ['b1'] },
]

describe('pruneUsedForActive', () => {
  test('removes used keys only for active categories', () => {
    const used = new Set<string>(['A::a1', 'B::b1'])
    const active = new Set<string>(['A'])
    const result = pruneUsedForActive(used, active, cats)
    expect(result).toEqual(new Set<string>(['B::b1']))
  })

  test('is a no-op for inactive categories', () => {
    const used = new Set<string>(['A::a1', 'B::b1'])
    const active = new Set<string>([])
    const result = pruneUsedForActive(used, active, cats)
    expect(result).toEqual(used)
  })
})

describe('drawFrom exhaustion + reshuffle composition', () => {
  test('returns null when active deck exhausted, non-null after reshuffle', () => {
    const active = new Set<string>(['A'])
    const used = new Set<string>(['A::a1', 'A::a2'])
    expect(drawFrom(cats, active, used, null)).toBeNull()
    const reshuffled = pruneUsedForActive(used, active, cats)
    const next = drawFrom(cats, active, reshuffled, null)
    expect(next).not.toBeNull()
    expect(next?.categoryName).toBe('A')
  })

  test('excludes used questions across many iterations', () => {
    const active = new Set<string>(['A'])
    const used = new Set<string>(['A::a1'])
    for (let i = 0; i < 50; i++) {
      const next: CardData | null = drawFrom(cats, active, used, null)
      expect(next).not.toBeNull()
      expect(next?.question).not.toBe('a1')
    }
  })
})
