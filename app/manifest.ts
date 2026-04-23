import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Docrud',
    short_name: 'Docrud',
    description: 'Document management, forms, PDF editing, AI tools, and secure file sharing in one workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fbff',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/docrud-favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/docrud-favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
