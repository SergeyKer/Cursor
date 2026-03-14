import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My Eng Bot — мой английский друг',
  description: 'Диалог и тренировка перевода на английском с ИИ',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'My Eng Bot' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        {/* При открытии клавиатуры на Android viewport сжимается — строка ввода остаётся видимой */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f0f0f0" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0d0d0d" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
