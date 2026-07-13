import type { MetadataRoute } from 'next'
import { featureFlags } from '@/lib/featureFlags'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://engvo.app'

export default function robots(): MetadataRoute.Robots {
  if (!featureFlags.quickTestV1) {
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/test', '/test/'],
      },
      sitemap: `${SITE}/sitemap.xml`,
    }
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
