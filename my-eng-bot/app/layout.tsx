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
    <html lang="ru" data-theme="bubble2" data-chat-pattern="none">
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
        <Script id="chat-pattern-bootstrap" strategy="beforeInteractive">
          {`(function(){try{var pk='myeng-chat-pattern';var p=localStorage.getItem(pk);var ok=p==='none'||p==='study-doodles'||p==='cosmos';var pattern=ok?p:'none';document.documentElement.setAttribute('data-chat-pattern',pattern);if(pattern!=='none'){var tk='myeng-chat-pattern-tuning-v1';var t={tileWidthPx:230,opacity:0.06,glassOpacity:0.06,blendMode:'multiply'};try{var raw=localStorage.getItem(tk);if(raw){var map=JSON.parse(raw);var s=map[pattern];if(s){var legacy=(s.tileWidthPx===300&&s.opacity===0.14&&s.glassOpacity===0.1&&s.blendMode==='multiply')||(s.tileWidthPx===190&&s.opacity===0.06&&s.glassOpacity===0.04&&s.blendMode==='multiply');if(!legacy){if(typeof s.tileWidthPx==='number')t.tileWidthPx=Math.min(500,Math.max(120,Math.round(s.tileWidthPx/10)*10));if(typeof s.opacity==='number')t.opacity=Math.min(0.4,Math.max(0.01,Math.round(s.opacity*100)/100));if(typeof s.glassOpacity==='number')t.glassOpacity=Math.min(0.4,Math.max(0.01,Math.round(s.glassOpacity*100)/100));var modes=['normal','multiply','soft-light','overlay','screen','darken'];if(modes.indexOf(s.blendMode)>=0)t.blendMode=s.blendMode}}}}catch(e2){}var st=document.documentElement.style;st.setProperty('--chat-pattern-tile-width',t.tileWidthPx+'px');st.setProperty('--chat-pattern-opacity',String(t.opacity));st.setProperty('--chat-pattern-glass-opacity',String(t.glassOpacity));st.setProperty('--chat-pattern-blend-mode',t.blendMode)}}catch(e){document.documentElement.setAttribute('data-chat-pattern','none')}})();`}
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
