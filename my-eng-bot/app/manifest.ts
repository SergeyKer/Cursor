import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyEng - мой английский друг',
    short_name: 'MyEng',
    description: 'Диалог и тренировка перевода на английском с ИИ',
    start_url: '/',
    // Чтобы браузер реже предлагал установку как приложение, используем обычный режим.
    display: 'browser',
    orientation: 'portrait',
    background_color: '#C1E9D5',
    theme_color: '#C1E9D5',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    lang: 'ru',
  }
}
