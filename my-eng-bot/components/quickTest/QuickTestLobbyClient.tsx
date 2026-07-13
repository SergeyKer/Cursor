'use client'

import { useCallback, useEffect, useState } from 'react'
import { QuickTestThemeGuard } from '@/components/quickTest/QuickTestThemeGuard'
import { QuickTestPageChrome } from '@/components/quickTest/QuickTestPageChrome'
import { QuickTestEngvoDialog } from '@/components/quickTest/QuickTestEngvoDialog'
import { resolveQuickTestFooter } from '@/lib/quickTest/quickTestFooter'
import type { QuickTestFooterView } from '@/lib/quickTest/quickTestFooter'
import { trackQuickTest } from '@/lib/quickTest/analytics'

export function QuickTestLobbyClient() {
  const [footer, setFooter] = useState<QuickTestFooterView>(() =>
    resolveQuickTestFooter({ phase: 'lobby-levels' })
  )

  useEffect(() => {
    trackQuickTest('page_view', { entrySource: 'test_lobby', slug: 'lobby' })
  }, [])

  const onFooterChange = useCallback((next: QuickTestFooterView) => {
    setFooter(next)
  }, [])

  return (
    <QuickTestThemeGuard>
      <QuickTestPageChrome
        footerDynamic={footer.dynamic}
        footerStatic={footer.static}
        footerTone={footer.tone}
        footerTypingKey={footer.typingKey}
        progress={footer.progress}
      >
        <QuickTestEngvoDialog onFooterChange={onFooterChange} />
      </QuickTestPageChrome>
    </QuickTestThemeGuard>
  )
}
