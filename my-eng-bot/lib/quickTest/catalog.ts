import type { QuickTestCatalogEntry, QuickTestLevelId, QuickTestTopicBank } from '@/lib/quickTest/types'
import { whoLikesVariants } from '@/lib/quickTest/content/who-likes'
import { introducingYourselfVariants } from '@/lib/quickTest/content/introducing-yourself'
import { itsTimeToVariants } from '@/lib/quickTest/content/its-time-to'
import { embeddedQuestionsVariants } from '@/lib/quickTest/content/embedded-questions'

const BANKS: QuickTestTopicBank[] = [
  {
    lessonId: '4',
    slug: 'introducing-yourself',
    level: 'A1',
    title: 'I am / I am from',
    variants: introducingYourselfVariants,
  },
  {
    lessonId: '1',
    slug: 'its-time-to',
    level: 'A2',
    title: 'It’s / It’s time to',
    variants: itsTimeToVariants,
  },
  {
    lessonId: '2',
    slug: 'who-likes',
    level: 'A2',
    title: 'Who ...?',
    variants: whoLikesVariants,
  },
  {
    lessonId: '3',
    slug: 'embedded-questions',
    level: 'A2',
    title: 'I know what she likes',
    variants: embeddedQuestionsVariants,
  },
]

/** Кураторский shortlist для лобби (не весь каталог). */
export const popularTopicSlugsByLevel: Record<QuickTestLevelId, string[]> = {
  A1: ['introducing-yourself'],
  A2: ['who-likes', 'its-time-to'],
  B1: [],
  B2: [],
}

/** Приоритет для чипа «Не знаю». */
export const recommendedTopicSlugPriority = ['who-likes', 'introducing-yourself'] as const

export function getAllQuickTestBanks(): QuickTestTopicBank[] {
  return BANKS
}

export function getQuickTestBankBySlug(slug: string): QuickTestTopicBank | null {
  return BANKS.find((bank) => bank.slug === slug) ?? null
}

export function getQuickTestCatalogEntries(): QuickTestCatalogEntry[] {
  return BANKS.map((bank) => ({
    lessonId: bank.lessonId,
    slug: bank.slug,
    level: bank.level,
    title: bank.title,
    enabled: bank.variants.length > 0,
    variantIds: bank.variants.map((v) => v.id),
  }))
}

export function getEnabledQuickTestSlugs(): string[] {
  return getQuickTestCatalogEntries()
    .filter((entry) => entry.enabled)
    .map((entry) => entry.slug)
}

export function getPopularTopicsForLevel(level: QuickTestLevelId): QuickTestCatalogEntry[] {
  const bySlug = new Map(getQuickTestCatalogEntries().map((entry) => [entry.slug, entry]))
  return popularTopicSlugsByLevel[level]
    .map((slug) => bySlug.get(slug))
    .filter((entry): entry is QuickTestCatalogEntry => Boolean(entry?.enabled))
}

export function isLevelFrozen(level: QuickTestLevelId): boolean {
  return getPopularTopicsForLevel(level).length === 0
}

export function resolveRecommendedTopicSlug(): string | null {
  const enabled = new Set(getEnabledQuickTestSlugs())
  for (const slug of recommendedTopicSlugPriority) {
    if (enabled.has(slug)) return slug
  }
  return getEnabledQuickTestSlugs()[0] ?? null
}

export function getVariantFromBank(slug: string, variantId: string) {
  const bank = getQuickTestBankBySlug(slug)
  if (!bank) return null
  return bank.variants.find((variant) => variant.id === variantId) ?? null
}
