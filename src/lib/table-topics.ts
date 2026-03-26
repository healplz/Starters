import data from '@/data/table-topics.json'

export type Category = {
  name: string
  questions: string[]
}

export function getAllCategories(): Category[] {
  return data.categories
}

export function getCategoryNames(): string[] {
  return data.categories.map((c) => c.name)
}

export function getCategory(name: string): Category | undefined {
  return data.categories.find((c) => c.name === name)
}

export function getRandomQuestion(categoryName?: string): string {
  const pool = categoryName
    ? (getCategory(categoryName)?.questions ?? [])
    : data.categories.flatMap((c) => c.questions)

  if (pool.length === 0) throw new Error(`No questions found for category: ${categoryName}`)

  return pool[Math.floor(Math.random() * pool.length)]
}

export function getAllQuestions(): string[] {
  return data.categories.flatMap((c) => c.questions)
}
