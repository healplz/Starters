'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Category } from '@/lib/table-topics'

const FLIP_MS = 300
const TIMER_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '120s', value: 120 },
] as const

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

type CardData = { question: string; categoryName: string }

function drawFrom(categories: Category[], activeCats: Set<string>): CardData {
  const pool = categories.filter((c) => activeCats.has(c.name))
  const cat = pickRandom(pool)
  return { question: pickRandom(cat.questions), categoryName: cat.name }
}

export default function CardDeck({ categories }: { categories: Category[] }) {
  const allNames = new Set(categories.map((c) => c.name))

  const [activeCats, setActiveCats] = useState<Set<string>>(allNames)
  const [card, setCard] = useState<CardData | null>(null)
  const [faceUp, setFaceUp] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Timer state
  const [timerDuration, setTimerDuration] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear timer interval
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Start or restart the timer
  const resetTimer = useCallback(() => {
    clearTimer()
    setTimerExpired(false)
    if (timerDuration > 0) {
      setTimeRemaining(timerDuration)
      setTimerActive(true)
    } else {
      setTimeRemaining(0)
      setTimerActive(false)
    }
  }, [timerDuration, clearTimer])

  // Countdown effect
  useEffect(() => {
    if (!timerActive || timeRemaining <= 0) return

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearTimer()
          setTimerActive(false)
          setTimerExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return clearTimer
  }, [timerActive, clearTimer])

  // Stop timer when duration is set to 0
  useEffect(() => {
    if (timerDuration === 0) {
      clearTimer()
      setTimerActive(false)
      setTimeRemaining(0)
      setTimerExpired(false)
    }
  }, [timerDuration, clearTimer])

  const deal = useCallback((cats: Set<string>) => {
    if (cats.size === 0 || isAnimating) return
    const next = drawFrom(categories, cats)
    if (!faceUp) {
      setCard(next)
      setFaceUp(true)
    } else {
      setIsAnimating(true)
      setFaceUp(false)
      setTimeout(() => {
        setCard(next)
        setFaceUp(true)
        setIsAnimating(false)
      }, FLIP_MS / 2)
    }
    // Reset timer on new deal
    // Timer reset happens after state settles via useEffect-like mechanism
    setTimeout(() => {
      resetTimer()
    }, faceUp ? FLIP_MS / 2 : 0)
  }, [faceUp, isAnimating, categories, resetTimer])

  useEffect(() => {
    setCard(drawFrom(categories, new Set(allNames)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start timer on initial card if duration > 0
  useEffect(() => {
    if (card && timerDuration > 0 && !timerActive && timeRemaining === 0 && !timerExpired) {
      resetTimer()
    }
  // Only run when card changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card])

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

  const handleTimerChange = (value: number) => {
    clearTimer()
    setTimerDuration(value)
    setTimerActive(false)
    setTimerExpired(false)
    if (value > 0) {
      setTimeRemaining(value)
      setTimerActive(true)
    } else {
      setTimeRemaining(0)
    }
  }

  const isAllSelected = activeCats.size === allNames.size
  const deckSize = categories
    .filter((c) => activeCats.has(c.name))
    .reduce((sum, c) => sum + c.questions.length, 0)
  const canDraw = activeCats.size > 0
  const timerProgress = timerDuration > 0 ? timeRemaining / timerDuration : 1

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-zinc-900/80 backdrop-blur-sm rounded-2xl px-8 py-10 flex flex-col items-center gap-8">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Starters</h1>
        <p className="text-sm text-zinc-500 mt-1">A conversation starter for every occasion</p>
      </header>

      {/* Card — 3D flip */}
      <div
        style={{
          perspective: '1000px',
          width: '100%',
          maxWidth: '320px',
          aspectRatio: '5 / 7',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: `transform ${FLIP_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Back face */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
              backgroundColor: '#1a1a4e',
              borderRadius: '8px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.4)' }}>✦</span>
            <p
              style={{
                fontWeight: 700,
                fontSize: '1.5rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#fff',
                margin: 0,
              }}
            >
              Starters
            </p>
          </div>

          {/* Front face — CAH white card aesthetic */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
              backgroundColor: '#fff',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: '8px',
              boxShadow: timerExpired
                ? '0 0 0 4px #ef4444, 0 8px 40px rgba(0,0,0,0.4)'
                : '0 8px 40px rgba(0,0,0,0.4)',
              boxSizing: 'border-box',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              {/* Timer countdown on card face */}
              {timerActive && timerDuration > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: '4px',
                      backgroundColor: '#e5e5e5',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${timerProgress * 100}%`,
                        height: '100%',
                        backgroundColor: timeRemaining <= 10 ? '#ef4444' : '#000',
                        borderRadius: '2px',
                        transition: 'width 1s linear, background-color 0.3s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: timeRemaining <= 10 ? '#ef4444' : '#000',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '2.4em',
                      textAlign: 'right',
                    }}
                  >
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              {timerExpired && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                    Time's up!
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
          </div>
        </div>
      </div>

      {/* Draw button + timer row */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {/* Draw button */}
        <button
          onClick={() => deal(activeCats)}
          disabled={!canDraw || isAnimating}
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
          {faceUp ? 'Draw Another' : 'Draw'}
        </button>

        {/* Timer selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mr-1">
            Timer
          </span>
          {TIMER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTimerChange(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                timerDuration === opt.value
                  ? 'bg-zinc-700 text-zinc-100 border-zinc-500'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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
