import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import PwaServiceWorkerRegister from '@/components/PwaServiceWorkerRegister'
import VisualViewportInsets from '@/components/VisualViewportInsets'
import { ThemeProvider } from '@/contexts/ThemeContext'

export const metadata: Metadata = {
  title: 'Engvo AI - English Voice',
  description: 'Диалог и тренировка перевода на английском с ИИ',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Engvo AI' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" data-theme="bubble2">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="theme-color" content="#5093EE" />
        <link rel="icon" href="/icon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="msapplication-TileColor" content="#5093EE" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {`(function(){try{var k='myeng_theme';var t=localStorage.getItem(k);var ok=t==='basic'||t==='futuristic'||t==='bubble1'||t==='bubble2'||t==='glass1'||t==='glass2'||t==='glass3';document.documentElement.setAttribute('data-theme',ok?t:'bubble2')}catch(e){document.documentElement.setAttribute('data-theme','bubble2')}})();`}
        </Script>
        <Script id="mobile-vv-bootstrap" strategy="beforeInteractive">
          {`(function(){try{var ua=navigator.userAgent;var ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&/Mobile/.test(ua));var android=/Android/i.test(ua);if(ios){if(/FxiOS\\/\\d+/i.test(ua)||/EdgiOS\\/\\d+/i.test(ua)||/OPiOS\\/\\d+/i.test(ua))return;var isCriOS=/CriOS\\/\\d+/i.test(ua);if(!isCriOS&&!/Safari\\/\\d+/i.test(ua))return;}else if(!android)return;var vv=window.visualViewport;if(!vv)return;var h=vv.height;if(!(typeof h==='number'&&isFinite(h)&&h>0))return;var px=Math.round(h)+'px';document.documentElement.style.setProperty('--app-vv-height',px);document.documentElement.style.setProperty('--ios-safari-vv-height',px)}catch(e){}})();`}
        </Script>
        <ThemeProvider>
          <PwaServiceWorkerRegister />
          <VisualViewportInsets />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
