import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import FooterSheetHarness from './FooterSheetHarness'

export default function FooterSheetHarnessPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <Suspense fallback={null}>
      <FooterSheetHarness />
    </Suspense>
  )
}
