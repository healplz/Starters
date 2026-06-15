'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Category } from '@/lib/table-topics'

const FLIP_MS = 300
const MAX_HISTORY = 10
const STORAGE_HISTORY_KEY = 'starters_history'
const STORAGE_USED_KEY = 'starters_used'
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

function questionKey(card: CardData): string {
  return `${card.categoryName}::${card.question}`
}

type CardData = { question: string; categoryName: string }

/** Pick a random question, excluding used questions and preferring unseen/fresh ones. */
function drawFrom(
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

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota exceeded – ignore */ }
}

/** Draw the current card onto a canvas and return a blob. */
function renderCardToBlob(
  question: string,
  categoryName: string,
  timerInfo?: { expired: boolean; remaining: number; duration: number } | null,
): Promise<Blob | null> {
  const WIDTH = 640
  const HEIGHT = Math.round(WIDTH * (7 / 5)) // 5:7 aspect ratio
  const PAD = 48

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  // White card background
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(0, 0, WIDTH, HEIGHT, 16)
  ctx.fill()

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 8
  ctx.beginPath()
  ctx.roundRect(0, 0, WIDTH, HEIGHT, 16)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // Re-draw white on top of shadow
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(0, 0, WIDTH, HEIGHT, 16)
  ctx.fill()

  const textX = PAD
  const textWidth = WIDTH - PAD * 2

  // Question text
  ctx.fillStyle = '#000000'
  ctx.textBaseline = 'top'

  const fontSize = HEIGHT < 500 ? 22 : 28
  ctx.font = `700 ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`

  // Word-wrap the question
  const words = question.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const test = currentLine ? currentLine + ' ' + word : word
    const metrics = ctx.measureText(test)
    if (metrics.width > textWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = test
    }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = fontSize * 1.35
  const questionHeight = lines.length * lineHeight
  const maxQuestionArea = HEIGHT - PAD * 2 - 40 - 30 // leave room for category + timer
  const startY = Math.min(PAD, PAD + (maxQuestionArea - questionHeight) / 2)

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX, startY + i * lineHeight)
  }

  // Timer info at bottom of question area if active
  let bottomOffset = PAD + Math.max(questionHeight, 60) + 8

  if (timerInfo && timerInfo.duration > 0) {
    const barY = bottomOffset
    const barHeight = 6
    const progress = timerInfo.remaining / timerInfo.duration

    // Progress bar track
    ctx.fillStyle = '#e5e5e5'
    ctx.beginPath()
    ctx.roundRect(textX, barY, textWidth, barHeight, 3)
    ctx.fill()

    // Progress bar fill
    ctx.fillStyle = timerInfo.remaining <= 10 ? '#ef4444' : '#000000'
    ctx.beginPath()
    ctx.roundRect(textX, barY, textWidth * progress, barHeight, 3)
    ctx.fill()

    // Time remaining text
    ctx.font = `700 16px "Helvetica Neue", Helvetica, Arial, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillStyle = timerInfo.remaining <= 10 ? '#ef4444' : '#000000'
    const timeStr = formatTime(timerInfo.remaining)
    const timeMetrics = ctx.measureText(timeStr)
    ctx.fillText(timeStr, WIDTH - PAD - timeMetrics.width, barY + barHeight + 4)

    if (timerInfo.expired) {
      ctx.font = `700 16px "Helvetica Neue", Helvetica, Arial, sans-serif`
      ctx.fillStyle = '#ef4444'
      ctx.fillText("Time's up!", textX, barY + barHeight + 4)
    }

    bottomOffset = barY + barHeight + 28
  }

  // Category name at bottom
  const shortCat = shortName(categoryName)
  ctx.font = `700 14px "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = '#000000'
  ctx.fillText(shortCat.toUpperCase(), textX, HEIGHT - PAD)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

export default function CardDeck({ categories }: { categories: Category[] }) {
  const allNames = new Set(categories.map((c) => c.name))

  const [activeCats, setActiveCats] = useState<Set<string>>(allNames)
  const [card, setCard] = useState<CardData | null>(null)
  const [faceUp, setFaceUp] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [allExhausted, setAllExhausted] = useState(false)

  // Session history + used questions
  const [history, setHistory] = useState<CardData[]>(() =>
    loadFromStorage<CardData[]>(STORAGE_HISTORY_KEY, [])
  )
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(() => {
    const arr = loadFromStorage<string[]>(STORAGE_USED_KEY, [])
    return new Set(arr)
  })
  const [showHistory, setShowHistory] = useState(false)

  // Persist history and used questions to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_HISTORY_KEY, history)
  }, [history])

  useEffect(() => {
    saveToStorage(STORAGE_USED_KEY, Array.from(usedQuestions))
  }, [usedQuestions])

  // Timer state
  const [timerDuration, setTimerDuration] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)
  const [timerKey, setTimerKey] = useState(0) // incremented on each reset to force effect re-run
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
      setTimerKey((k) => k + 1) // force the countdown effect to re-run
    } else {
      setTimeRemaining(0)
      setTimerActive(false)
    }
  }, [timerDuration, clearTimer])

  // Countdown effect — re-runs whenever timerKey changes (on each reset or start)
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
  }, [timerActive, timerKey, clearTimer])

  // Stop timer when duration is set to 0
  useEffect(() => {
    if (timerDuration === 0) {
      clearTimer()
      setTimerActive(false)
      setTimeRemaining(0)
      setTimerExpired(false)
    }
  }, [timerDuration, clearTimer])

  const performDraw = useCallback((cats: Set<string>, used: Set<string>, prevCard: CardData | null, hist?: CardData[]) => {
    const next = drawFrom(categories, cats, used, prevCard, hist)
    setAllExhausted(next === null)
    return next
  }, [categories])

  const deal = useCallback((cats: Set<string>) => {
    if (cats.size === 0 || isAnimating) return

    // Build the used set: include all previously used questions, and auto-mark
    // the current card as used when drawing a new one.
    const nextUsed = card ? new Set(usedQuestions).add(questionKey(card)) : usedQuestions
    const prevCard = card

    const next = performDraw(cats, nextUsed, prevCard, history)
    if (!next) {
      setAllExhausted(true)
      return
    }

    if (!faceUp) {
      // First draw — no card to mark as used
      setCard(next)
      setFaceUp(true)
    } else {
      // Auto-mark current card as used, push to history
      setUsedQuestions(nextUsed)
      if (card) {
        setHistory((prev) => [card, ...prev].slice(0, MAX_HISTORY))
      }
      setIsAnimating(true)
      setFaceUp(false)
      setTimeout(() => {
        setCard(next)
        setFaceUp(true)
        setIsAnimating(false)
      }, FLIP_MS / 2)
    }
    setTimeout(() => {
      resetTimer()
    }, faceUp ? FLIP_MS / 2 : 0)
  }, [faceUp, isAnimating, categories, performDraw, card, usedQuestions, history, resetTimer])

  useEffect(() => {
    const initial = performDraw(new Set(allNames), usedQuestions, null, [])
    if (initial) {
      setCard(initial)
      setFaceUp(true)
    } else {
      setAllExhausted(true)
    }
  // Run once on mount
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

  /** Share the current card as an image — exported image never includes the timer */
  const shareCard = useCallback(async () => {
    if (!card) return

    const blob = await renderCardToBlob(
      card.question,
      card.categoryName,
      null, // timer is never included in exported images
    )
    if (!blob) return

    const file = new File([blob], 'starters-card.png', { type: 'image/png' })

    // Try Web Share API with image
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Starters',
          text: card.question,
          files: [file],
        })
        return
      } catch {
        // User cancelled or API failed – fall through
      }
    }

    // Fallback: download the image
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'starters-card.png'
    a.click()
    URL.revokeObjectURL(url)
  }, [card, timerDuration, timerExpired, timeRemaining])

  /** Copy the question text to clipboard */
  const copyQuestion = useCallback(async () => {
    if (!card) return
    try {
      await navigator.clipboard.writeText(card.question)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = card.question
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }, [card])

  /** Reset the session: clear history and used questions */
  const resetSession = () => {
    setHistory([])
    setUsedQuestions(new Set())
    setAllExhausted(false)
    // Re-draw the initial card
    const next = drawFrom(categories, activeCats, new Set(), null, [])
    if (next) {
      setCard(next)
      setFaceUp(true)
      resetTimer()
    }
  }

  const isAllSelected = activeCats.size === allNames.size

  const totalQuestions = categories
    .filter((c) => activeCats.has(c.name))
    .reduce((sum, c) => sum + c.questions.length, 0)

  const remainingQuestions = categories
    .filter((c) => activeCats.has(c.name))
    .reduce((sum, c) => {
      return sum + c.questions.filter((q) => !usedQuestions.has(`${c.name}::${q}`)).length
    }, 0)

  const canDraw = activeCats.size > 0 && remainingQuestions > 0 && !isAnimating
  const timerProgress = timerDuration > 0 ? timeRemaining / timerDuration : 1
  const isUsed = card ? usedQuestions.has(questionKey(card)) : false

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
              {allExhausted ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      lineHeight: 1.4,
                      color: '#000',
                      margin: '0 0 8px 0',
                      textAlign: 'center',
                    }}
                  >
                    All questions used!
                  </p>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: '#666',
                      margin: 0,
                      textAlign: 'center',
                    }}
                  >
                    Reset your session to start fresh.
                  </p>
                </div>
              ) : (
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
              )}
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
              {isUsed && !allExhausted && (
                <div style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 600 }}>
                    Already used
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

      {/* Draw button + action row */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {/* Draw button */}
        {allExhausted ? (
          <button
            onClick={resetSession}
            className="flex items-center gap-2 px-7 py-3 rounded-full bg-amber-500 text-zinc-900 text-sm font-medium hover:bg-amber-400 active:scale-95 transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset Session
          </button>
        ) : (
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
        )}

        {/* Secondary action row */}
        {card && !allExhausted && (
          <div className="flex items-center gap-2">
            <button
              onClick={shareCard}
              disabled={isAnimating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700 hover:text-sky-300 hover:border-sky-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Share card as image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>
            <button
              onClick={copyQuestion}
              disabled={isAnimating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700 hover:text-zinc-300 hover:border-zinc-500 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Copy question text"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </button>
            <button
              onClick={resetSession}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-800 text-zinc-500 text-xs font-medium border border-zinc-700 hover:text-zinc-300 hover:border-zinc-500 transition-all cursor-pointer"
              title={history.length > 0 || usedQuestions.size > 0 ? 'Reset session (clear history and used questions)' : 'Reset session'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset
            </button>
          </div>
        )}

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
            {canDraw || allExhausted
              ? `${remainingQuestions} / ${totalQuestions} available`
              : 'no categories selected'}
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
            const usedInCat = cat.questions.filter((q) => usedQuestions.has(`${cat.name}::${q}`)).length
            return (
              <button
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                  isActive ? s.pillActive : s.pill
                }`}
              >
                {shortName(cat.name)}
                {isActive && usedInCat > 0 && (
                  <span className="ml-1.5 opacity-60">{cat.questions.length - usedInCat}/{cat.questions.length}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* History strip */}
      {history.length > 0 && (
        <div className="w-full max-w-2xl flex flex-col items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400 transition-colors cursor-pointer"
          >
            {showHistory ? 'Hide history' : `Show history (${history.length})`}
          </button>

          {showHistory && (
            <div className="w-full max-h-40 overflow-y-auto flex flex-col gap-1.5 px-2">
              {history.map((entry, i) => (
                <div
                  key={`${i}-${entry.question}`}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 text-sm"
                >
                  <span className="text-zinc-600 text-xs mt-0.5 shrink-0 w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug text-zinc-300">
                      {entry.question}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{shortName(entry.categoryName)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
