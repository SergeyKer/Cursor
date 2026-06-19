import type { StartBridgeState } from '@/lib/start/startBridge'

export type AppShellProps = {
  entryBridge?: StartBridgeState | null
  onRuntimeReady?: () => void
}
