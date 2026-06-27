import Link from 'next/link'
import { Suspense } from 'react'
import { getCategories } from '@/lib/table-topics'
import AdminPanel from './_components/AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const categories = await getCategories()

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">← Starters</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-sm font-medium text-zinc-200">Admin</h1>
        </div>
      </header>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Loading…</div>}>
        <AdminPanel categories={categories} />
      </Suspense>
    </div>
  )
}
