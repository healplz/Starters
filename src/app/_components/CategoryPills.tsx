'use client'

import { getPillStyles, shortName } from '@/lib/categories'
import type { Category } from '@/lib/table-topics'

type CategoryPillsProps = {
  categories: Category[]
  activeCats: Set<string>
  remainingQuestions: number
  totalQuestions: number
  isAllSelected: boolean
  onToggle: (name: string) => void
  onSelectAll: () => void
}

export function CategoryPills({
  categories,
  activeCats,
  remainingQuestions,
  totalQuestions,
  isAllSelected,
  onToggle,
  onSelectAll,
}: CategoryPillsProps) {
  return (
    <div className="w-full max-w-2xl flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Your deck
        </p>
        <span className="text-xs text-zinc-600">
          {activeCats.size > 0
            ? `${remainingQuestions} / ${totalQuestions} available`
            : 'no categories selected'}
        </span>
        <button
          onClick={onSelectAll}
          className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400 transition-colors cursor-pointer"
        >
          {isAllSelected ? 'clear all' : 'select all'}
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((cat) => {
          const s = getPillStyles(cat.name)
          const isActive = activeCats.has(cat.name)
          return (
            <button
              key={cat.name}
              data-testid="category-pill"
              aria-pressed={isActive}
              onClick={() => onToggle(cat.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                isActive ? s.pillActive : s.pill
              }`}
            >
              {shortName(cat.name)}
            </button>
          )
        })}
      </div>
    </div>
  )
}