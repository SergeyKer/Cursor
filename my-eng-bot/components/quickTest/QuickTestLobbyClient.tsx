'use client'

import { useCallback, useEffect, useState } from 'react'
import { QuickTestThemeGuard } from '@/components/quickTest/QuickTestThemeGuard'
import { QuickTestPageChrome } from '@/components/quickTest/QuickTestPageChrome'
import { QuickTestEngvoDialog } from '@/components/quickTest/QuickTestEngvoDialog'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import { trackQuickTest } from '@/lib/quickTest/analytics'

export function QuickTestLobbyClient() {
  const [footerDynamic, setFooterDynamic] = useState<string>(QUICK_TEST_COPY.pickLevelDynamic)
  const [footerStatic, setFooterStatic] = useState<string>(QUICK_TEST_COPY.staticLobby)

  useEffect(() => {
    trackQuickTest('page_view', { entrySource: 'test_lobby', slug: 'lobby' })
  }, [])

  const onFooterChange = useCallback((dynamic: string, staticText: string) => {
    setFooterDynamic(dynamic)
    setFooterStatic(staticText)
  }, [])

  return (
    <QuickTestThemeGuard>
      <QuickTestPageChrome footerDynamic={footerDynamic} footerStatic={footerStatic}>
        <QuickTestEngvoDialog onFooterChange={onFooterChange} />
      </QuickTestPageChrome>
    </QuickTestThemeGuard>
  )
}
