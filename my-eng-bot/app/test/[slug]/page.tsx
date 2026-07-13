import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { featureFlags } from '@/lib/featureFlags'
import { getQuickTestBankBySlug, getVariantFromBank } from '@/lib/quickTest/catalog'
import { DEFAULT_VARIANT_ID } from '@/lib/quickTest/selectVariant'
import { shuffleOptionsDeterministic } from '@/lib/quickTest/shuffleOptions'
import { QuickTestSlugClient } from '@/components/quickTest/QuickTestSlugClient'
import type { QuickTestEntrySource } from '@/lib/quickTest/types'

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string }
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

async function resolveParams(params: PageProps['params']) {
  return await Promise.resolve(params)
}

async function resolveSearch(searchParams: PageProps['searchParams']) {
  return await Promise.resolve(searchParams ?? {})
}

function firstString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!featureFlags.quickTestV1) return { title: 'Engvo AI' }
  const { slug } = await resolveParams(params)
  const bank = getQuickTestBankBySlug(slug)
  if (!bank) return { title: 'Engvo AI' }
  const title = `${bank.title} — быстрый тест | Engvo AI`
  const description = `5 вопросов · 2 минуты · разбор ошибок по теме «${bank.title}».`
  const canonical = `/test/${bank.slug}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
  }
}

export default async function QuickTestSlugPage({ params, searchParams }: PageProps) {
  if (!featureFlags.quickTestV1) notFound()

  const { slug } = await resolveParams(params)
  const query = await resolveSearch(searchParams)
  const bank = getQuickTestBankBySlug(slug)
  if (!bank) notFound()

  const variantParam = firstString(query.variant)
  const fromShare = firstString(query.from) === 'share'
  const forceDefaultVariant = !variantParam
  const variantId = forceDefaultVariant ? DEFAULT_VARIANT_ID : variantParam || DEFAULT_VARIANT_ID
  const variant = getVariantFromBank(slug, variantId) ?? getVariantFromBank(slug, DEFAULT_VARIANT_ID)
  if (!variant) notFound()

  const q1 = variant.questions[0]!
  const shuffled = shuffleOptionsDeterministic(q1.options, q1.correctIndex, `${variant.id}:${q1.id}`)

  const entrySource: QuickTestEntrySource = fromShare
    ? 'shared_link'
    : forceDefaultVariant
      ? 'external_deep_link'
      : 'test_lobby'

  return (
    <QuickTestSlugClient
      slug={slug}
      requestedVariantId={forceDefaultVariant ? null : variantId}
      forceDefaultVariant={forceDefaultVariant}
      entrySource={entrySource}
      fromShare={fromShare}
      ssrPrompt={q1.prompt}
      ssrOptions={shuffled.options}
    />
  )
}
