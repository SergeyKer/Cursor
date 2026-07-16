'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuickTestThemeGuard } from '@/components/quickTest/QuickTestThemeGuard'
import { QuickTestPageChrome } from '@/components/quickTest/QuickTestPageChrome'
import { QuickTestEngvoDialog } from '@/components/quickTest/QuickTestEngvoDialog'
import { getQuickTestBankBySlug, resolveRecommendedTopicSlug } from '@/lib/quickTest/catalog'
import { writeEntryContext } from '@/lib/quickTest/openLessonIntent'
import { resolveQuickTestFooter } from '@/lib/quickTest/quickTestFooter'
import type { QuickTestFooterView } from '@/lib/quickTest/quickTestFooter'
import { trackQuickTest } from '@/lib/quickTest/analytics'
import { readProgress } from '@/lib/quickTest/storage'
import { getCompletedVariantIds, selectVariantId } from '@/lib/quickTest/selectVariant'

export function QuickTestLobbyClient() {
  const router = useRouter()
  const [footer, setFooter] = useState<QuickTestFooterView>(() =>
    resolveQuickTestFooter({ phase: 'lobby-levels' })
  )
  const [debugSlug, setDebugSlug] = useState<string | null>(null)

  useEffect(() => {
    trackQuickTest('page_view', { entrySource: 'test_lobby', slug: 'lobby' })
  }, [])

  const onFooterChange = useCallback((next: QuickTestFooterView) => {
    setFooter(next)
  }, [])

  const handleDebugSkipToQuickTestFinale = useCallback(() => {
    const slug = debugSlug ?? resolveRecommendedTopicSlug()
    if (!slug) return
    const bank = getQuickTestBankBySlug(slug)
    if (!bank) return
    const variantId = selectVariantId({
      slug,
      completedVariantIds: getCompletedVariantIds(readProgress(), bank.lessonId),
      forceDefault: false,
    })
    router.push(`/test/${slug}?variant=${encodeURIComponent(variantId)}&debugFinale=1`)
  }, [debugSlug, router])

  const handleRestartQuickTestIntro = useCallback(() => {
    writeEntryContext({ source: 'internal_menu', audience: 'adult' })
    window.location.assign('/test')
  }, [])

  return (
    <QuickTestThemeGuard>
      <QuickTestPageChrome
        onDebugSkipToQuickTestFinale={handleDebugSkipToQuickTestFinale}
        quickTestLobbyActiveForDebug
        onOpenQuickTest={handleRestartQuickTestIntro}
        footerDynamic={footer.dynamic}
        footerStatic={footer.static}
        footerTone={footer.tone}
        footerTypingKey={footer.typingKey}
        progress={footer.progress}
      >
        <QuickTestEngvoDialog onFooterChange={onFooterChange} onDebugSlugChange={setDebugSlug} />
      </QuickTestPageChrome>
    </QuickTestThemeGuard>
  )
}
