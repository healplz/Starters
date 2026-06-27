'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Category } from '@/lib/table-topics'
import BulkImport from './BulkImport'

type Props = { categories: Category[] }

export default function AdminPanel({ categories: initialCategories }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState(initialCategories)
  const [, startTransition] = useTransition()
  const [mode, setMode] = useState<'editor' | 'bulk'>('editor')
  // Track questions that existed at load time — these are read-only
  const originalQuestions = useMemo<Map<string, Set<string>>>(
    () => new Map(initialCategories.map((c) => [c.name, new Set(c.questions)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const selectedCat = searchParams.get('cat') ?? categories[0]?.name ?? ''
  const currentCategory = categories.find((c) => c.name === selectedCat)

  function selectCategory(name: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('cat', name)
    router.push(`/admin?${params.toString()}`)
  }

  async function addCategory(name: string) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return
    setCategories((prev) => [...prev, { name, questions: [] }])
    selectCategory(name)
  }

  async function addQuestion(category: string, question: string) {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, question }),
    })
    if (!res.ok) return
    setCategories((prev) =>
      prev.map((c) =>
        c.name === category ? { ...c, questions: [...c.questions, question] } : c
      )
    )
    startTransition(() => router.refresh())
  }

  async function editQuestion(category: string, oldQuestion: string, newQuestion: string) {
    const res = await fetch(`/api/questions/${encodeURIComponent(category)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldQuestion, newQuestion }),
    })
    if (!res.ok) return
    setCategories((prev) =>
      prev.map((c) =>
        c.name === category
          ? { ...c, questions: c.questions.map((q) => (q === oldQuestion ? newQuestion : q)) }
          : c
      )
    )
    startTransition(() => router.refresh())
  }

  async function deleteQuestion(category: string, question: string) {
    const res = await fetch(`/api/questions/${encodeURIComponent(category)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    if (!res.ok) return
    setCategories((prev) =>
      prev.map((c) =>
        c.name === category
          ? { ...c, questions: c.questions.filter((q) => q !== question) }
          : c
      )
    )
    startTransition(() => router.refresh())
  }

  function handleBulkImported(items: { category: string; question: string }[]) {
    setCategories((prev) =>
      prev.map((c) => {
        const newQs = items.filter((i) => i.category === c.name).map((i) => i.question)
        return newQs.length > 0 ? { ...c, questions: [...c.questions, ...newQs] } : c
      })
    )
    startTransition(() => router.refresh())
    setMode('editor')
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col overflow-y-auto">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Categories</span>
          <button
            onClick={() => setMode(mode === 'bulk' ? 'editor' : 'bulk')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              mode === 'bulk'
                ? 'bg-zinc-700 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {mode === 'bulk' ? '← Editor' : 'Bulk import'}
          </button>
        </div>
        <nav className="flex-1 px-2 pb-2">
          {categories.map((c) => (
            <button
              key={c.name}
              onClick={() => { selectCategory(c.name); setMode('editor') }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                c.name === selectedCat && mode === 'editor'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <span className="block truncate">{c.name.replace(' Table Topics Questions', '')}</span>
              <span className="text-xs text-zinc-600">{c.questions.length} questions</span>
            </button>
          ))}
        </nav>
        <AddCategoryButton onAdd={addCategory} />
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {mode === 'bulk' ? (
          <BulkImport categories={categories} onImported={handleBulkImported} />
        ) : currentCategory ? (
          <QuestionPanel
            category={currentCategory}
            originalQuestions={originalQuestions.get(currentCategory.name) ?? new Set()}
            onAdd={(q) => addQuestion(currentCategory.name, q)}
            onEdit={(old, next) => editQuestion(currentCategory.name, old, next)}
            onDelete={(q) => deleteQuestion(currentCategory.name, q)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Select a category
          </div>
        )}
      </main>
    </div>
  )
}

function AddCategoryButton({ onAdd }: { onAdd: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mx-2 mb-3 px-3 py-2 text-sm text-zinc-600 hover:text-zinc-400 transition-colors text-left"
      >
        + Add category
      </button>
    )
  }

  return (
    <div className="mx-2 mb-3 flex flex-col gap-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setEditing(false); setValue('') }
        }}
        placeholder="Category name"
        className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-500 w-full"
      />
      <div className="flex gap-1">
        <button onClick={submit} className="flex-1 px-2 py-1 text-xs rounded bg-white text-zinc-900 font-medium hover:bg-zinc-100">
          Add
        </button>
        <button onClick={() => { setEditing(false); setValue('') }} className="flex-1 px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200">
          Cancel
        </button>
      </div>
    </div>
  )
}

function QuestionPanel({
  category,
  originalQuestions,
  onAdd,
  onEdit,
  onDelete,
}: {
  category: Category
  originalQuestions: Set<string>
  onAdd: (question: string) => void
  onEdit: (old: string, next: string) => void
  onDelete: (question: string) => void
}) {
  const [newQ, setNewQ] = useState('')

  function submitNew() {
    const trimmed = newQ.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setNewQ('')
  }

  return (
    <>
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-200">
          {category.name.replace(' Table Topics Questions', '')}
          <span className="ml-2 text-zinc-600 font-normal">{category.questions.length} questions</span>
        </h2>
      </div>

      {/* Add question input */}
      <div className="px-6 py-3 border-b border-zinc-800 flex gap-2">
        <input
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitNew() }}
          placeholder="Add a new question…"
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={submitNew}
          disabled={!newQ.trim()}
          className="px-4 py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Question list */}
      <ul className="flex-1 overflow-y-auto px-6 py-3 flex flex-col gap-1">
        {category.questions.map((q, i) => (
          <QuestionRow
            key={i}
            question={q}
            readOnly={originalQuestions.has(q)}
            onEdit={(next) => onEdit(q, next)}
            onDelete={() => onDelete(q)}
          />
        ))}
        {category.questions.length === 0 && (
          <li className="text-sm text-zinc-600 py-4 text-center">No questions yet</li>
        )}
      </ul>
    </>
  )
}

function QuestionRow({
  question,
  readOnly,
  onEdit,
  onDelete,
}: {
  question: string
  readOnly: boolean
  onEdit: (next: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(question)

  function save() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== question) onEdit(trimmed)
    setEditing(false)
  }

  function cancel() {
    setValue(question)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="flex gap-2 items-center">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') cancel()
          }}
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-500 text-zinc-100 text-sm focus:outline-none"
        />
        <button onClick={save} className="px-3 py-2 text-xs rounded bg-white text-zinc-900 font-medium hover:bg-zinc-100 shrink-0">Save</button>
        <button onClick={cancel} className="px-3 py-2 text-xs rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 shrink-0">Cancel</button>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
      <span className="flex-1 text-sm text-zinc-300 leading-snug">{question}</span>
      {!readOnly && (
        <>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 px-1"
            aria-label="Edit"
          >
            ✏
          </button>
          <button
            onClick={onDelete}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 px-1"
            aria-label="Delete"
          >
            ✕
          </button>
        </>
      )}
    </li>
  )
}
