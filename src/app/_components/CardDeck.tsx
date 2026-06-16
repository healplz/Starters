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

/** Draw the current card onto a canvas and return a blob. Always timer-free. */
function renderCardToBlob(
  question: string,
  categoryName: string,
): Promise<Blob | null> {
  const CARD_W = 520
  const CARD_H = Math.round(CARD_W * (7 / 5)) // 5:7 aspect ratio
  const MARGIN = 44
  const HEADER_H = 70
  const WIDTH = CARD_W + MARGIN * 2
  const HEIGHT = CARD_H + MARGIN * 2 + HEADER_H

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  // Dark navy page background
  ctx.fillStyle = '#080B81'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Subtle geometric diamond pattern (matching the page bg)
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  const diamondSize = 60
  for (let row = -1; row < Math.ceil(HEIGHT / diamondSize) + 1; row++) {
    for (let col = -1; col < Math.ceil(WIDTH / diamondSize) + 1; col++) {
      const x = col * diamondSize + (row % 2) * (diamondSize / 2)
      const y = row * diamondSize * 0.5
      ctx.beginPath()
      ctx.moveTo(x, y + diamondSize * 0.25)
      ctx.lineTo(x + diamondSize * 0.5, y)
      ctx.lineTo(x + diamondSize, y + diamondSize * 0.25)
      ctx.lineTo(x + diamondSize * 0.5, y + diamondSize * 0.5)
      ctx.closePath()
      ctx.fill()
    }
  }

  const cardX = MARGIN
  const cardY = MARGIN + HEADER_H

  // Card shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 6
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, CARD_W, CARD_H, 12)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // Card interior
  const PAD = 36
  const textX = cardX + PAD
  const textY = cardY + PAD
  const textWidth = CARD_W - PAD * 2

  // Question text
  ctx.fillStyle = '#000000'
  ctx.textBaseline = 'top'

  const fontSize = 24
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
  const maxQuestionArea = CARD_H - PAD * 2 - 40
  const startY = textY + Math.min(0, (maxQuestionArea - questionHeight) / 2)

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX, startY + i * lineHeight)
  }

  // Category name at bottom of card
  const shortCat = shortName(categoryName)
  ctx.font = `700 12px "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = '#000000'
  ctx.fillText(shortCat.toUpperCase(), textX, cardY + CARD_H - PAD)

  // "Starters" branding in the header area
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `700 18px "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText('STARTERS', WIDTH / 2, MARGIN + HEADER_H / 2)

  // Small diamond accent next to branding
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = `14px sans-serif`
  ctx.fillText('✦', WIDTH / 2 - 60, MARGIN + HEADER_H / 2)
  ctx.textAlign = 'left'

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

  // Session history + used questions — start empty to avoid hydration mismatch
  // with localStorage. Load saved data after mount.
  const [history, setHistory] = useState<CardData[]>([])
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const savedHistory = loadFromStorage<CardData[]>(STORAGE_HISTORY_KEY, [])
    if (savedHistory.length > 0) setHistory(savedHistory)
    const savedUsed = loadFromStorage<string[]>(STORAGE_USED_KEY, [])
    if (savedUsed.length > 0) setUsedQuestions(new Set(savedUsed))
    setHydrated(true)
  }, [])

  // Persist history and used questions to localStorage (only after hydration)
  useEffect(() => {
    if (!hydrated) return
    saveToStorage(STORAGE_HISTORY_KEY, history)
  }, [history, hydrated])

  useEffect(() => {
    if (!hydrated) return
    saveToStorage(STORAGE_USED_KEY, Array.from(usedQuestions))
  }, [usedQuestions, hydrated])

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

  const performDraw = useCallback((
    activeCats: Set<string>,
    usedQuestions: Set<string>,
    previousCard: CardData | null,
    history?: CardData[],
  ) => {
    const next = drawFrom(categories, activeCats, usedQuestions, previousCard, history)
    setAllExhausted(next === null)
    return next
  }, [categories])

  const deal = useCallback((cats: Set<string>) => {
    if (cats.size === 0 || isAnimating) return

    if (!faceUp) {
      // First draw — reveal the pre-loaded card
      setFaceUp(true)
      setTimeout(() => { resetTimer() }, 0)
      return
    }

    // Auto-mark current card as used and draw a new one
    const nextUsed = card ? new Set(usedQuestions).add(questionKey(card)) : usedQuestions

    const next = performDraw(cats, nextUsed, card, history)
    if (!next) {
      setAllExhausted(true)
      return
    }

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
      resetTimer()
    }, FLIP_MS / 2)
  }, [faceUp, isAnimating, performDraw, card, usedQuestions, history, resetTimer])

  useEffect(() => {
    const initial = performDraw(new Set(allNames), usedQuestions, null, [])
    if (initial) {
      setCard(initial)
      // faceUp stays false — card back shows on load. First click flips it.
    } else {
      setAllExhausted(true)
    }
  // Run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleTimerChange = (value: number) => {
    clearTimer()
    setTimerDuration(value)
    setTimerExpired(false)
    if (value > 0) {
      // Set the duration but don't start the timer yet — it starts on the next draw
      setTimeRemaining(value)
      setTimerActive(false)
    } else {
      setTimeRemaining(0)
      setTimerActive(false)
    }
  }

  /** Render the current card to a blob, returns null if no card or render fails. */
  const cardToBlob = useCallback(async (): Promise<Blob | null> => {
    if (!card) return null
    return renderCardToBlob(card.question, card.categoryName)
  }, [card])

  /** Share the current card as an image via the system share sheet (fallback: download). */
  const shareCard = useCallback(async () => {
    const blob = await cardToBlob()
    if (!blob) return

    const file = new File([blob], 'starters-card.png', { type: 'image/png' })

    if (navigator.share) {
      const canShareFiles = navigator.canShare?.({ files: [file] })
      if (canShareFiles) {
        try {
          await navigator.share({ title: 'Starters', text: card?.question ?? '', files: [file] })
          return
        } catch {
          /* cancelled or failed — fall through */
        }
      } else {
        // Browser has share but can't share files — try sharing text instead
        try {
          await navigator.share({ title: 'Starters', text: card?.question ?? '' })
          return
        } catch {
          /* cancelled or failed — fall through to download */
        }
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'starters-card.png'
    a.click()
    URL.revokeObjectURL(url)
  }, [cardToBlob, card])

  /** Copy the rendered card image to the clipboard. */
  const copyImage = useCallback(async () => {
    const blob = await cardToBlob()
    if (!blob) return

    // 1. Try ClipboardItem API (supported in Chrome 76+, Safari 13.1+, Edge 79+)
    try {
      const file = new File([blob], 'starters-card.png', { type: 'image/png' })
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': file })])
      return
    } catch {
      /* clipboard write not supported — try text fallback */
    }

    // 2. Copy the question text instead (available everywhere)
    try {
      await navigator.clipboard.writeText(card?.question ?? '')
      return
    } catch {
      /* text copy also failed — download instead */
    }

    // 3. Last resort: download the image
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'starters-card.png'
    a.click()
    URL.revokeObjectURL(url)
  }, [cardToBlob, card])

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
              onClick={copyImage}
              disabled={isAnimating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700 hover:text-zinc-300 hover:border-zinc-500 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Copy card image to clipboard"
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
            {activeCats.size > 0
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

      {/* History drawer — slides in from the right */}
      {history.length > 0 && (
        <>
          {/* Trigger tab — folder tab style, vertical orientation */}
          <button
            onClick={() => setShowHistory(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 py-[25px] px-8 rounded-tl-lg rounded-bl-lg bg-zinc-800/80 text-zinc-400 text-xs font-medium hover:text-zinc-200 hover:bg-zinc-700/80 transition-all cursor-pointer shadow-lg"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            title="Open history"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: 'rotate(90deg)' }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span>History</span>
            <span className="text-zinc-600">{history.length}</span>
          </button>

          {/* Backdrop */}
          {showHistory && (
            <div
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
            />
          )}

          {/* Drawer panel */}
          <div
            className={`fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-zinc-900 border-l border-zinc-800 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
              showHistory ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <h2 className="text-sm font-medium text-zinc-200">
                History
                <span className="ml-2 text-zinc-600 font-normal">{history.length} card{history.length !== 1 ? 's' : ''}</span>
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                aria-label="Close history"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
              {history.map((entry, i) => (
                <div
                  key={`${i}-${entry.question}`}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-zinc-600 text-xs mt-0.5 shrink-0 w-5 text-right font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug text-zinc-300">
                      {entry.question}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{shortName(entry.categoryName)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
