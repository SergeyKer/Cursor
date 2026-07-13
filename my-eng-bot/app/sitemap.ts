import type { MetadataRoute } from 'next'
import { featureFlags } from '@/lib/featureFlags'
import { getEnabledQuickTestSlugs } from '@/lib/quickTest/catalog'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://engvo.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1 },
  ]
  if (!featureFlags.quickTestV1) return base
  return [
    ...base,
    { url: `${SITE}/test`, changeFrequency: 'weekly', priority: 0.7 },
    ...getEnabledQuickTestSlugs().map((slug) => ({
      url: `${SITE}/test/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
