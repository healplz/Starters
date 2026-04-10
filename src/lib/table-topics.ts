import fallbackData from '@/data/table-topics.json'

export type Category = {
  name: string
  questions: string[]
}

type KVData = { categories: Category[] }

function hasKvConfig() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

export async function getCategories(): Promise<Category[]> {
  if (!hasKvConfig()) return fallbackData.categories

  try {
    const { kv } = await import('@vercel/kv')
    const stored = await kv.get<KVData>('table-topics')
    return stored?.categories ?? fallbackData.categories
  } catch {
    return fallbackData.categories
  }
}

export async function saveCategories(categories: Category[]): Promise<void> {
  if (!hasKvConfig()) throw new Error('KV not configured')

  const { kv } = await import('@vercel/kv')
  await kv.set('table-topics', { categories })
}
