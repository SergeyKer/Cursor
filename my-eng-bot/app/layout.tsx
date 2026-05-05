import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import VisualViewportInsets from '@/components/VisualViewportInsets'
import { ThemeProvider } from '@/contexts/ThemeContext'

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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="theme-color" content="#C1E9D5" />
        <link rel="icon" href="/icon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="msapplication-TileColor" content="#C1E9D5" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased">
        <Script id="ios-safari-vv-bootstrap" strategy="beforeInteractive">
          {`(function(){try{var ua=navigator.userAgent;var ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&/Mobile/.test(ua));if(!ios)return;if(/CriOS\\/\\d+/i.test(ua)||/FxiOS\\/\\d+/i.test(ua)||/EdgiOS\\/\\d+/i.test(ua)||/OPiOS\\/\\d+/i.test(ua))return;if(!/Safari\\/\\d+/i.test(ua))return;var vv=window.visualViewport;if(!vv)return;var h=vv.height;if(!(typeof h==='number'&&isFinite(h)&&h>0))return;document.documentElement.style.setProperty('--ios-safari-vv-height',Math.round(h)+'px')}catch(e){}})();`}
        </Script>
        <ThemeProvider>
          <VisualViewportInsets />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
