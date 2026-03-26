'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllCategories } from '@/lib/table-topics'

const categories = getAllCategories()
const allNames = new Set(categories.map((c) => c.name))

// Full class strings written out so Tailwind's scanner picks them up
const CATEGORY_STYLES: Record<string, { pill: string; pillActive: string }> = {
  'Funny Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-amber-300 hover:border-amber-700',
    pillActive: 'bg-zinc-800 text-amber-300 border-amber-700',
  },
  'Thought-Provoking Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-violet-300 hover:border-violet-700',
    pillActive: 'bg-zinc-800 text-violet-300 border-violet-700',
  },
  'Personal Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-sky-300 hover:border-sky-700',
    pillActive: 'bg-zinc-800 text-sky-300 border-sky-700',
  },
  'Would You Rather Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-orange-300 hover:border-orange-700',
    pillActive: 'bg-zinc-800 text-orange-300 border-orange-700',
  },
  'Family-Friendly Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-emerald-300 hover:border-emerald-700',
    pillActive: 'bg-zinc-800 text-emerald-300 border-emerald-700',
  },
  'Work and Team Building Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-slate-300 hover:border-slate-500',
    pillActive: 'bg-zinc-800 text-slate-300 border-slate-500',
  },
  'Creative Thinking Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-rose-300 hover:border-rose-700',
    pillActive: 'bg-zinc-800 text-rose-300 border-rose-700',
  },
  'This or That Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-teal-300 hover:border-teal-700',
    pillActive: 'bg-zinc-800 text-teal-300 border-teal-700',
  },
  'Imaginative Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-indigo-300 hover:border-indigo-700',
    pillActive: 'bg-zinc-800 text-indigo-300 border-indigo-700',
  },
  'Random and Fun Table Topics Questions': {
    pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-green-300 hover:border-green-700',
    pillActive: 'bg-zinc-800 text-green-300 border-green-700',
  },
}

const DEFAULT_PILL = {
  pill: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-500',
  pillActive: 'bg-zinc-800 text-zinc-200 border-zinc-500',
}

function getPillStyles(categoryName: string) {
  return CATEGORY_STYLES[categoryName] ?? DEFAULT_PILL
}

function shortName(name: string): string {
  return name.replace(' Table Topics Questions', '').replace(' and ', ' & ')
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

type CardData = { question: string; categoryName: string }

function drawFrom(activeCats: Set<string>): CardData {
  const pool = categories.filter((c) => activeCats.has(c.name))
  const cat = pickRandom(pool)
  return { question: pickRandom(cat.questions), categoryName: cat.name }
}

export default function Home() {
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set(allNames))
  const [card, setCard] = useState<CardData | null>(null)
  const [visible, setVisible] = useState(true)

  const deal = useCallback((cats: Set<string>) => {
    if (cats.size === 0) return
    setVisible(false)
    setTimeout(() => {
      setCard(drawFrom(cats))
      setVisible(true)
    }, 120)
  }, [])

  useEffect(() => {
    setCard(drawFrom(new Set(allNames)))
  }, [])

  const toggleCategory = (name: string) => {
    setActiveCats((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const isAllSelected = activeCats.size === allNames.size
  const deckSize = categories
    .filter((c) => activeCats.has(c.name))
    .reduce((sum, c) => sum + c.questions.length, 0)
  const canDraw = activeCats.size > 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-zinc-900/80 backdrop-blur-sm rounded-2xl px-8 py-10 flex flex-col items-center gap-8">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Starters</h1>
        <p className="text-sm text-zinc-500 mt-1">A conversation starter for every occasion</p>
      </header>

      {/* Card — CAH white card aesthetic */}
      <div
        style={{
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          backgroundColor: '#fff',
          width: '100%',
          maxWidth: '320px',
          aspectRatio: '5 / 7',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: '8px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 120ms ease-in-out',
        }}
      >
        <p
          style={{
            fontWeight: 700,
            fontSize: '1.25rem',
            lineHeight: 1.4,
            color: '#000',
            margin: 0,
            textAlign: 'left',
          }}
        >
          {card?.question ?? ''}
        </p>
        <p
          style={{
            fontWeight: 700,
            fontSize: '0.65rem',
            color: '#000',
            margin: 0,
            textAlign: 'left',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {card ? shortName(card.categoryName) : ''}
        </p>
      </div>

      {/* Draw button */}
      <button
        onClick={() => deal(activeCats)}
        disabled={!canDraw}
        className="flex items-center gap-2 px-7 py-3 rounded-full bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Draw Another
      </button>

      {/* Category multi-select */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Your deck
          </p>
          <span className="text-xs text-zinc-600">
            {canDraw ? `${deckSize} questions` : 'no categories selected'}
          </span>
          <button
            onClick={() => setActiveCats(isAllSelected ? new Set() : new Set(allNames))}
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
                onClick={() => toggleCategory(cat.name)}
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
      </div>
    </div>
  )
}
