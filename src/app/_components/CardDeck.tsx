'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Category } from '@/lib/table-topics'
import { drawFrom, questionKey, pruneUsedForActive, type CardData } from '@/lib/draw'
import { loadFromStorage, saveToStorage } from '@/lib/storage'
import { renderCardToBlob } from '@/lib/card-image'
import { useReducedMotion } from './useReducedMotion'
import { useTimer } from './useTimer'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { CardFace } from './CardFace'
import { HistoryDrawer } from './HistoryDrawer'
import { CategoryPills } from './CategoryPills'
import { TimerControls, TIMER_OPTIONS } from './TimerControls'

const FLIP_MS = 300
const MAX_HISTORY = 10
const STORAGE_HISTORY_KEY = 'starters_history'
const STORAGE_USED_KEY = 'starters_used'

export default function CardDeck({ categories }: { categories: Category[] }) {
  const allNames = new Set(categories.map((c) => c.name))
  const reducedMotion = useReducedMotion()
  const flipMs = reducedMotion ? 0 : FLIP_MS

  const [activeCats, setActiveCats] = useState<Set<string>>(allNames)
  const [card, setCard] = useState<CardData | null>(null)
  const [faceUp, setFaceUp] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [allExhausted, setAllExhausted] = useState(false)

  const [history, setHistory] = useState<CardData[]>([])
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const savedHistory = loadFromStorage<CardData[]>(STORAGE_HISTORY_KEY, [])
    if (savedHistory.length > 0) setHistory(savedHistory)
    const savedUsed = loadFromStorage<string[]>(STORAGE_USED_KEY, [])
    if (savedUsed.length > 0) setUsedQuestions(new Set(savedUsed))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveToStorage(STORAGE_HISTORY_KEY, history)
  }, [history, hydrated])

  useEffect(() => {
    if (!hydrated) return
    saveToStorage(STORAGE_USED_KEY, Array.from(usedQuestions))
  }, [usedQuestions, hydrated])

  const timer = useTimer()

  const performDraw = useCallback((
    cats: Set<string>,
    used: Set<string>,
    previousCard: CardData | null,
    hist?: CardData[],
  ) => {
    const next = drawFrom(categories, cats, used, previousCard, hist)
    setAllExhausted(next === null)
    return next
  }, [categories])

  const deal = useCallback((cats: Set<string>) => {
    if (cats.size === 0 || isAnimating) return

    if (!faceUp) {
      setFaceUp(true)
      setTimeout(() => { timer.reset() }, 0)
      return
    }

    const nextUsed = card ? new Set(usedQuestions).add(questionKey(card)) : usedQuestions

    let next = performDraw(cats, nextUsed, card, history)
    let usedAfter = nextUsed
    if (!next) {
      usedAfter = pruneUsedForActive(nextUsed, cats, categories)
      next = performDraw(cats, usedAfter, card, history)
    }
    if (!next) { setAllExhausted(true); return }
    setUsedQuestions(usedAfter)
    if (card) setHistory((prev) => [card, ...prev].slice(0, MAX_HISTORY))
    setIsAnimating(true)
    setFaceUp(false)
    setTimeout(() => {
      setCard(next)
      setFaceUp(true)
      setIsAnimating(false)
      timer.reset()
    }, flipMs / 2)
  }, [faceUp, isAnimating, performDraw, card, usedQuestions, history, timer, flipMs, categories])

  // Pre-load initial card on mount
  useEffect(() => {
    const initial = performDraw(new Set(allNames), usedQuestions, null, [])
    if (initial) {
      setCard(initial)
    } else {
      setAllExhausted(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCategory = (name: string) => {
    setActiveCats((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const cardToBlob = useCallback(async (): Promise<Blob | null> => {
    if (!card) return null
    return renderCardToBlob(card.question, card.categoryName)
  }, [card])

  const shareCard = useCallback(async () => {
    const blob = await cardToBlob()
    if (!blob) return
    const file = new File([blob], 'starters-card.png', { type: 'image/png' })
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouchDevice && navigator.share) {
      const canShareFiles = navigator.canShare?.({ files: [file] })
      if (canShareFiles) {
        try { await navigator.share({ title: 'Starters', files: [file] }); return } catch { /* fall through */ }
      } else {
        try { await navigator.share({ title: 'Starters', text: card?.question ?? '' }); return } catch { /* fall through */ }
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'starters-card.png'
    a.click()
    URL.revokeObjectURL(url)
  }, [cardToBlob, card])

  const copyImage = useCallback(async () => {
    if (!card) return
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': cardToBlob().then((b) => { if (!b) throw new Error('no blob'); return b }),
          }),
        ])
        return
      } catch { /* fall through */ }
    }
    const blob = await cardToBlob()
    if (!blob) return
    try { await navigator.clipboard.writeText(card.question); return } catch { /* fall through */ }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'starters-card.png'
    a.click()
    URL.revokeObjectURL(url)
  }, [cardToBlob, card])

  const resetSession = () => {
    setHistory([])
    setUsedQuestions(new Set())
    setAllExhausted(false)
    const next = drawFrom(categories, activeCats, new Set(), null, [])
    if (next) { setCard(next); setFaceUp(true); timer.reset() }
  }

  const isAllSelected = activeCats.size === allNames.size
  const totalQuestions = categories
    .filter((c) => activeCats.has(c.name))
    .reduce((sum, c) => sum + c.questions.length, 0)
  const remainingQuestions = categories
    .filter((c) => activeCats.has(c.name))
    .reduce((sum, c) => sum + c.questions.filter((q) => !usedQuestions.has(`${c.name}::${q}`)).length, 0)
  const canDraw = activeCats.size > 0 && remainingQuestions > 0 && !isAnimating

  useKeyboardShortcuts({
    onDraw: () => { if (canDraw) deal(activeCats); else if (allExhausted) resetSession() },
    onReset: resetSession,
    onCopy: () => { if (card && !allExhausted) copyImage() },
    onShare: () => { if (card && !allExhausted) shareCard() },
    onToggleHistory: () => setShowHistory((v) => !v),
    onCloseHistory: () => setShowHistory(false),
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-zinc-900/80 backdrop-blur-sm rounded-2xl px-8 py-10 flex flex-col items-center gap-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Starters</h1>
          <p className="text-sm text-zinc-500 mt-1">A conversation starter for every occasion</p>
        </header>

        <CardFace
          card={card}
          faceUp={faceUp}
          flipMs={flipMs}
          allExhausted={allExhausted}
          timerActive={timer.active}
          timerDuration={timer.duration}
          timeRemaining={timer.remaining}
          timerExpired={timer.expired}
        />

        {/* Draw button + action row */}
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          {allExhausted ? (
            <button
              data-testid="reset-session-button"
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
              data-testid="draw-button"
              onClick={() => deal(activeCats)}
              disabled={!canDraw || isAnimating}
              className="flex items-center gap-2 px-7 py-3 rounded-full bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {faceUp ? 'Draw Another' : 'Draw'}
            </button>
          )}

          {card && !allExhausted && (
            <div className="flex items-center gap-2">
              <button
                data-testid="share-button"
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
                data-testid="copy-button"
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
                data-testid="reset-button"
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

          <TimerControls
            options={TIMER_OPTIONS}
            current={timer.duration}
            onChange={timer.handleChange}
          />
        </div>

        <CategoryPills
          categories={categories}
          activeCats={activeCats}
          remainingQuestions={remainingQuestions}
          totalQuestions={totalQuestions}
          isAllSelected={isAllSelected}
          onToggle={toggleCategory}
          onSelectAll={() => setActiveCats(isAllSelected ? new Set() : new Set(allNames))}
        />
      </div>

      <HistoryDrawer
        history={history}
        open={showHistory}
        onOpen={() => setShowHistory(true)}
        onClose={() => setShowHistory(false)}
      />
    </div>
  )
}