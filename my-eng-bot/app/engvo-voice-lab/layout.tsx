import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Engvo Voice Lab',
  robots: { index: false, follow: false },
}

export default function EngvoVoiceLabLayout({ children }: { children: React.ReactNode }) {
  return children
}
