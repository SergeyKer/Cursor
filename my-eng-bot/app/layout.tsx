import type { Metadata } from 'next'
import './globals.css'
import VisualViewportInsets from '@/components/VisualViewportInsets'

export const metadata: Metadata = {
  title: 'MyEng - мой английский друг',
  description: 'Диалог и тренировка перевода на английском с ИИ',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MyEng' },
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
        <meta name="theme-color" content="#C1E9D5" />

        {/* Desktop favicon */}
        <link rel="icon" href="/icon-32.png" sizes="32x32" type="image/png" />

        {/* iOS home screen icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />

        {/* Windows pinned tile (часто используется как "иконка для компьютера") */}
        <meta name="msapplication-TileColor" content="#C1E9D5" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased">
        <VisualViewportInsets />
        {children}
      </body>
    </html>
  )
}
