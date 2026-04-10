import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getCategories, saveCategories } from '@/lib/table-topics'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === '1'
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/questions/[category]'>
) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category } = await ctx.params
  const categoryName = decodeURIComponent(category)
  const { oldQuestion, newQuestion } = await request.json()
  if (!oldQuestion || !newQuestion) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const categories = await getCategories()
  const target = categories.find((c) => c.name === categoryName)
  if (!target) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  const idx = target.questions.indexOf(oldQuestion)
  if (idx === -1) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  target.questions[idx] = newQuestion
  await saveCategories(categories)
  revalidatePath('/')

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/questions/[category]'>
) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category } = await ctx.params
  const categoryName = decodeURIComponent(category)
  const { question } = await request.json()
  if (!question) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const categories = await getCategories()
  const target = categories.find((c) => c.name === categoryName)
  if (!target) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  target.questions = target.questions.filter((q) => q !== question)
  await saveCategories(categories)
  revalidatePath('/')

  return NextResponse.json({ ok: true })
}
