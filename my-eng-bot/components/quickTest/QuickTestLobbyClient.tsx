'use client'

import { useCallback, useEffect, useState } from 'react'
import { QuickTestThemeGuard } from '@/components/quickTest/QuickTestThemeGuard'
import { QuickTestPageChrome } from '@/components/quickTest/QuickTestPageChrome'
import { QuickTestEngvoDialog } from '@/components/quickTest/QuickTestEngvoDialog'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import { trackQuickTest } from '@/lib/quickTest/analytics'

export function QuickTestLobbyClient() {
  const [footerDynamic, setFooterDynamic] = useState<string>(QUICK_TEST_COPY.pickLevelDynamic)

  useEffect(() => {
    trackQuickTest('page_view', { entrySource: 'test_lobby', slug: 'lobby' })
  }, [])

  const onFooterChange = useCallback((dynamic: string) => {
    setFooterDynamic(dynamic)
  }, [])

  return (
    <QuickTestThemeGuard>
      <QuickTestPageChrome footerDynamic={footerDynamic} progress={null}>
        <QuickTestEngvoDialog onFooterChange={onFooterChange} />
      </QuickTestPageChrome>
    </QuickTestThemeGuard>
  )
}
