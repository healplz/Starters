import { NextRequest, NextResponse } from 'next/server'
import { getCategories } from '@/lib/table-topics'

export async function GET(request: NextRequest) {
  const cat = request.nextUrl.searchParams.get('cat')
  const categories = await getCategories()

  const pool = cat
    ? categories.filter((c) => c.name.toLowerCase().includes(cat.toLowerCase()))
    : categories

  if (pool.length === 0) {
    return NextResponse.json({ error: `No matching category: ${cat}` }, { status: 404 })
  }

  const category = pool[Math.floor(Math.random() * pool.length)]
  const question = category.questions[Math.floor(Math.random() * category.questions.length)]

  return NextResponse.json({
    question,
    category: category.name.replace(' Table Topics Questions', '').trim(),
  })
}
