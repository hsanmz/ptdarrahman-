import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getNewsCached } from '@/app/lib/api'
import { mergeNewsArticles, fallbackNews } from '@/app/lib/news'
import { fetchActivePpdbWave } from '@/app/lib/ppdb'
import type { NewsArticle } from '@/app/lib/types'
import NewsDetailClient from './_components/NewsDetailClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  let allNews: NewsArticle[] | null = null
  try { allNews = await getNewsCached() } catch { allNews = null }
  const sourceNews = allNews && allNews.length > 0 ? allNews : fallbackNews()
  const article = mergeNewsArticles(sourceNews).find((a) => a.slug === slug)
  if (!article) {
    return { title: 'Berita Tidak Ditemukan' }
  }
  return {
    title: article.content?.title,
    description: article.content?.excerpt,
    openGraph: {
      title: `${article.content?.title} | PTDARRAHMAN`,
      description: article.content?.excerpt,
      images: [
        {
          url: article.image,
          width: 1200,
          height: 630,
          alt: article.content?.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.content?.title} | PTDARRAHMAN`,
      description: article.content?.excerpt,
      images: [article.image],
    },
  }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let allNews: NewsArticle[] | null = null
  try { allNews = await getNewsCached() } catch { allNews = null }
  const sourceNews = allNews && allNews.length > 0 ? allNews : fallbackNews()
  const safeNews = mergeNewsArticles(sourceNews)
  const article = safeNews.find((a) => a.slug === slug)
  if (!article || !article.content) notFound()
  let wave = null
  try { wave = await fetchActivePpdbWave() } catch { wave = null }
  return <NewsDetailClient article={article} allNews={safeNews} wave={wave} />
}
