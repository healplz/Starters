import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getCategories, saveCategories } from '@/lib/table-topics'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === '1'
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const categories = await getCategories()
  if (categories.some((c) => c.name === name)) {
    return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
  }

  categories.push({ name, questions: [] })
  await saveCategories(categories)
  revalidatePath('/')

  return NextResponse.json({ ok: true })
}
