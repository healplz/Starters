import { getCategories } from '@/lib/table-topics'
import CardDeck from './_components/CardDeck'

export default async function Home() {
  const categories = await getCategories()
  return <CardDeck categories={categories} />
}
