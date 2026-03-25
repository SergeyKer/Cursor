import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyEng - мой английский друг',
    short_name: 'MyEng',
    description: 'Диалог и тренировка перевода на английском с ИИ',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f0f0f0',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    lang: 'ru',
  }
}
