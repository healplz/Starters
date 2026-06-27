import { useEffect, useLayoutEffect, useRef } from 'react'

type Handlers = {
  onDraw: () => void
  onReset: () => void
  onCopy: () => void
  onShare: () => void
  onToggleHistory: () => void
  onCloseHistory: () => void
  onFavorite: () => void
}

export function useKeyboardShortcuts(handlers: Handlers): void {
  const ref = useRef(handlers)
  // Update ref synchronously before any paint so event listeners always call the latest closures
  useLayoutEffect(() => { ref.current = handlers })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const tag = (el?.tagName || '').toLowerCase()
      const typing =
        tag === 'input' || tag === 'textarea' || tag === 'select' || !!el?.isContentEditable
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case ' ':
          if (tag === 'button') return // let a focused button's own Space-click handle it
          e.preventDefault()
          ref.current.onDraw()
          break
        case 'r':
        case 'R':
          ref.current.onReset()
          break
        case 'c':
        case 'C':
          ref.current.onCopy()
          break
        case 's':
        case 'S':
          ref.current.onShare()
          break
        case 'h':
        case 'H':
          ref.current.onToggleHistory()
          break
        case 'f':
        case 'F':
          ref.current.onFavorite()
          break
        case 'Escape':
          ref.current.onCloseHistory()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}