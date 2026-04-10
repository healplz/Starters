import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getCategories, saveCategories } from '@/lib/table-topics'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === '1'
}

export async function GET() {
  const categories = await getCategories()
  return NextResponse.json({ categories })
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, question } = await request.json()
  if (!category || !question) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const categories = await getCategories()
  const target = categories.find((c) => c.name === category)
  if (!target) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  target.questions.push(question)
  await saveCategories(categories)
  revalidatePath('/')

  return NextResponse.json({ ok: true })
}
