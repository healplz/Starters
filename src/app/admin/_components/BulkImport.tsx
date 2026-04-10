'use client'

import { useState, useMemo } from 'react'
import type { Category } from '@/lib/table-topics'

function shortName(name: string) {
  return name.replace(' Table Topics Questions', '').trim()
}

type LineResult =
  | { status: 'valid'; fullCategory: string; shortCategory: string; question: string }
  | { status: 'bad-format'; raw: string }
  | { status: 'unknown-category'; raw: string; typed: string }
  | { status: 'duplicate'; shortCategory: string; question: string }
  | { status: 'empty' }

function parseLine(
  raw: string,
  shortToFull: Map<string, string>,
  existingQuestions: Map<string, Set<string>>
): LineResult {
  const trimmed = raw.trim()
  if (!trimmed) return { status: 'empty' }

  const commaIdx = trimmed.indexOf(',')
  if (commaIdx === -1) return { status: 'bad-format', raw: trimmed }

  const typedCategory = trimmed.slice(0, commaIdx).trim()
  const question = trimmed.slice(commaIdx + 1).trim()

  if (!typedCategory || !question) return { status: 'bad-format', raw: trimmed }

  const fullCategory = shortToFull.get(typedCategory.toLowerCase())
  if (!fullCategory) return { status: 'unknown-category', raw: trimmed, typed: typedCategory }

  if (existingQuestions.get(fullCategory)?.has(question)) {
    return { status: 'duplicate', shortCategory: shortName(fullCategory), question }
  }

  return { status: 'valid', fullCategory, shortCategory: shortName(fullCategory), question }
}

export default function BulkImport({
  categories,
  onImported,
}: {
  categories: Category[]
  onImported: (items: { category: string; question: string }[]) => void
}) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Map lowercase short name → full category name for flexible matching
  const shortToFull = useMemo(
    () => new Map(categories.map((c) => [shortName(c.name).toLowerCase(), c.name])),
    [categories]
  )
  const existingQuestions = useMemo(
    () => new Map(categories.map((c) => [c.name, new Set(c.questions)])),
    [categories]
  )

  const lines = useMemo(
    () => text.split('\n').map((raw) => parseLine(raw, shortToFull, existingQuestions)),
    [text, shortToFull, existingQuestions]
  )

  const validItems = useMemo(
    () => lines.flatMap((l) => (l.status === 'valid' ? [{ category: l.fullCategory, question: l.question }] : [])),
    [lines]
  )

  const hasContent = lines.some((l) => l.status !== 'empty')
  const errorCount = lines.filter((l) => l.status === 'bad-format' || l.status === 'unknown-category').length
  const dupCount = lines.filter((l) => l.status === 'duplicate').length

  async function handleImport() {
    if (validItems.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      })
      if (res.ok) {
        onImported(validItems)
        setDone(true)
        setText('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const exampleCategories = categories.slice(0, 2).map((c) => shortName(c.name))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-200">Bulk Import</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          One entry per line: <code className="text-zinc-400 bg-zinc-800 px-1 rounded">Category,Question text</code>
          {' · '}valid categories: {categories.map((c) => shortName(c.name)).join(', ')}
        </p>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Input */}
        <div className="flex flex-col w-1/2 border-r border-zinc-800 p-4 gap-3">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setDone(false) }}
            placeholder={`${exampleCategories[0]},Why did you become a cat person?\n${exampleCategories[1] ?? exampleCategories[0]},What's a skill you secretly want to learn?`}
            className="flex-1 w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 text-sm font-mono leading-relaxed focus:outline-none focus:border-zinc-500 resize-none"
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-600">
              {hasContent && (
                <>
                  <span className="text-emerald-400">{validItems.length} valid</span>
                  {errorCount > 0 && <span className="text-red-400 ml-2">{errorCount} error{errorCount > 1 ? 's' : ''}</span>}
                  {dupCount > 0 && <span className="text-amber-400 ml-2">{dupCount} duplicate{dupCount > 1 ? 's' : ''}</span>}
                </>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={validItems.length === 0 || submitting}
              className="px-4 py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? 'Importing…' : done ? 'Imported!' : `Import ${validItems.length > 0 ? validItems.length : ''} question${validItems.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* Validation preview */}
        <div className="flex-1 overflow-y-auto p-4">
          {!hasContent ? (
            <p className="text-sm text-zinc-600 text-center pt-8">Validation results will appear here</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {lines.map((line, i) => {
                if (line.status === 'empty') return null
                return <ValidationLine key={i} result={line} />
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function ValidationLine({ result }: { result: LineResult }) {
  if (result.status === 'empty') return null

  if (result.status === 'valid') {
    return (
      <li className="flex items-start gap-2 text-sm">
        <span className="shrink-0 text-emerald-400 mt-0.5">✓</span>
        <span>
          <span className="text-zinc-500 text-xs">{result.shortCategory} · </span>
          <span className="text-zinc-300">{result.question}</span>
        </span>
      </li>
    )
  }

  if (result.status === 'duplicate') {
    return (
      <li className="flex items-start gap-2 text-sm">
        <span className="shrink-0 text-amber-400 mt-0.5">≈</span>
        <span>
          <span className="text-zinc-500 text-xs">{result.shortCategory} · </span>
          <span className="text-zinc-500 line-through">{result.question}</span>
          <span className="text-amber-500 text-xs ml-1">duplicate</span>
        </span>
      </li>
    )
  }

  if (result.status === 'unknown-category') {
    return (
      <li className="flex items-start gap-2 text-sm">
        <span className="shrink-0 text-red-400 mt-0.5">✕</span>
        <span>
          <span className="text-red-400 text-xs">Unknown category: </span>
          <span className="text-zinc-400 font-mono text-xs">{result.typed}</span>
        </span>
      </li>
    )
  }

  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="shrink-0 text-red-400 mt-0.5">✕</span>
      <span>
        <span className="text-red-400 text-xs">Bad format: </span>
        <span className="text-zinc-400 font-mono text-xs">{result.raw}</span>
      </span>
    </li>
  )
}
