'use client'

import { shortName } from '@/lib/categories'
import type { CardData } from '@/lib/draw'

type HistoryDrawerProps = {
  history: CardData[]
  open: boolean
  onOpen: () => void
  onClose: () => void
}

export function HistoryDrawer({ history, open, onOpen, onClose }: HistoryDrawerProps) {
  if (history.length === 0) return null

  return (
    <>
      {/* Trigger tab — folder tab style, vertical orientation */}
      <button
        data-testid="history-tab"
        onClick={onOpen}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 py-[25px] px-8 rounded-tl-lg rounded-bl-lg bg-zinc-800/80 text-zinc-400 text-xs font-medium hover:text-zinc-200 hover:bg-zinc-700/80 transition-all cursor-pointer shadow-lg"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        title="Open history"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: 'rotate(90deg)' }}>
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <span>History</span>
        <span data-testid="history-count" className="text-zinc-600">{history.length}</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Drawer panel */}
      <div
        data-testid="history-drawer"
        className={`fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-zinc-900 border-l border-zinc-800 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm font-medium text-zinc-200">
            History
            <span className="ml-2 text-zinc-600 font-normal">
              {history.length} card{history.length !== 1 ? 's' : ''}
            </span>
          </h2>
          <button
            onClick={onClose}
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
                <p className="text-sm leading-snug text-zinc-300">{entry.question}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{shortName(entry.categoryName)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}