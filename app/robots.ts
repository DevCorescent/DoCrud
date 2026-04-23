import type { MetadataRoute } from 'next'
import { getPublicAppBaseUrl } from '@/lib/url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicAppBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
