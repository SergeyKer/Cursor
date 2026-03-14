import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Eng Bot — помощник по английскому',
  description: 'Диалог и тренировка перевода на английском с ИИ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
