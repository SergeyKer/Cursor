import { notFound } from 'next/navigation'
import { featureFlags } from '@/lib/featureFlags'
import { QuickTestLobbyClient } from '@/components/quickTest/QuickTestLobbyClient'

export default function QuickTestLobbyPage() {
  if (!featureFlags.quickTestV1) notFound()
  return <QuickTestLobbyClient />
}
