import type { Metadata } from 'next'
import './globals.css'
import VisualViewportInsets from '@/components/VisualViewportInsets'

export const metadata: Metadata = {
  title: 'MyEng Bot — мой английский друг',
  description: 'Диалог и тренировка перевода на английском с ИИ',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MyEng Bot' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        {/* viewport-fit=cover — safe area на iOS (notch, home indicator). interactive-widget — поведение клавиатуры на Android */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="theme-color" content="#f0f0f0" />
      </head>
      <body className="min-h-screen antialiased">
        <VisualViewportInsets />
        {children}
      </body>
    </html>
  )
}
