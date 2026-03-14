import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'My Eng Bot — мой друг по английскому',
    short_name: 'My Eng Bot',
    description: 'Диалог и тренировка перевода на английском с ИИ',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fafafa',
    theme_color: '#2563eb',
    lang: 'ru',
  }
}
