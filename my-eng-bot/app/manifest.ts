import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyEng Bot — мой английский друг',
    short_name: 'MyEng Bot',
    description: 'Диалог и тренировка перевода на английском с ИИ',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f0f0f0',
    theme_color: '#2563eb',
    lang: 'ru',
  }
}
