import { buildShareChallengeText } from '@/lib/uiCopy/quickTest'

export function buildQuickTestShareUrl(slug: string, origin?: string): string {
  const base =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL) ||
    'https://engvo.app'
  return new URL(`/test/${slug}?from=share`, base).toString()
}

export function buildQuickTestSharePayload(input: {
  slug: string
  topicTitle: string
  correct: number
  total: number
  durationLabel: string
  origin?: string
}): { text: string; url: string } {
  const url = buildQuickTestShareUrl(input.slug, input.origin)
  return {
    url,
    text: buildShareChallengeText({
      topicTitle: input.topicTitle,
      correct: input.correct,
      total: input.total,
      durationLabel: input.durationLabel,
      absoluteUrl: url,
    }),
  }
}
