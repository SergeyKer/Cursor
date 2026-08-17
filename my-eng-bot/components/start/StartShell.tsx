'use client'

import { AppIconFrame } from '@/components/AppIconFrame'
import HomeWelcomeBubble from '@/components/HomeWelcomeBubble'
import HomeLandingActions from '@/components/home/HomeLandingActions'
import { featureFlags } from '@/lib/featureFlags'
import { buildCompactGreeting } from '@/lib/homeGreeting'
import { saveHomeAudienceChosen } from '@/lib/home/audienceGate'
import type { Audience } from '@/lib/types'
import { mergeBridgeState, type StartBridgeState } from '@/lib/start/startBridge'
import { DIALOG_SESSION_COLUMN_MAX_CLASS } from '@/lib/dialogSessionChrome'

export type StartShellProps = {
  bridge: StartBridgeState
  onBridgeChange: (next: StartBridgeState) => void
}

export default function StartShell({ bridge, onBridgeChange }: StartShellProps) {
  const chooseAudience = (audience: Audience) => {
    saveHomeAudienceChosen(true)
    onBridgeChange(
      mergeBridgeState(bridge, {
        audience,
        audienceChosen: true,
      })
    )
  }

  return (
    <div
      className="start-screen chat-shell-x relative z-10 flex h-0 min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
      style={{ scrollPaddingBottom: 'var(--app-footer-chrome-height)' }}
    >
      <div
        className={`pointer-events-auto relative z-10 mx-auto flex w-full ${DIALOG_SESSION_COLUMN_MAX_CLASS} flex-col items-center pb-2`}
        style={{
          gap: 'clamp(1rem, 2.5vh, 1.75rem)',
          paddingTop: 'clamp(1rem, 2.5vh, 1.75rem)',
          paddingBottom: 'calc(var(--app-footer-chrome-height) + clamp(1rem, 2.5vh, 1.75rem))',
        }}
      >
        {featureFlags.homeMascotVisible ? (
          <div className="flex w-full shrink-0 justify-center">
            <div className="w-1/4 max-w-[5.8125rem] shrink-0">
              <AppIconFrame variant="home" src="/engvo-mascot.png" alt="Engvo AI" className="w-full" priority />
            </div>
          </div>
        ) : null}

        <div className="flex w-full flex-col items-center gap-[clamp(1rem,3.2vh,2rem)]">
          <HomeWelcomeBubble
            text={buildCompactGreeting({
              audienceChosen: bridge.audienceChosen,
              audience: bridge.audience ?? 'adult',
            })}
          />

          {!bridge.audienceChosen ? (
            <HomeLandingActions
              audienceChosen={false}
              audience="adult"
              onChooseChild={() => chooseAudience('child')}
              onChooseAdult={() => chooseAudience('adult')}
              onStart={() => undefined}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
