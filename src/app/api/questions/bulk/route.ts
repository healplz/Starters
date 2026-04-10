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

  const { items } = await request.json() as { items: { category: string; question: string }[] }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 })
  }

  const categories = await getCategories()
  const categoryMap = new Map(categories.map((c) => [c.name, c]))

  for (const { category, question } of items) {
    const cat = categoryMap.get(category)
    if (!cat) continue
    if (!cat.questions.includes(question)) {
      cat.questions.push(question)
    }
  }

  await saveCategories(categories)
  revalidatePath('/')

  return NextResponse.json({ ok: true, count: items.length })
}
