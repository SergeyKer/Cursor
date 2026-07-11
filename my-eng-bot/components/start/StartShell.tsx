'use client'

import { AppIconFrame } from '@/components/AppIconFrame'
import HomeWelcomeBubble from '@/components/HomeWelcomeBubble'
import { featureFlags } from '@/lib/featureFlags'
import { buildCompactGreeting } from '@/lib/homeGreeting'
import {
  PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS,
  PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS,
} from '@/lib/homeCtaStyles'
import type { Audience } from '@/lib/types'
import { mergeBridgeState, type StartBridgeState } from '@/lib/start/startBridge'

export type StartShellProps = {
  bridge: StartBridgeState
  onBridgeChange: (next: StartBridgeState) => void
}

export default function StartShell({ bridge, onBridgeChange }: StartShellProps) {
  const chooseAudience = (audience: Audience) => {
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
        className="pointer-events-auto relative z-10 mx-auto flex w-full max-w-[23.2rem] flex-col items-center pb-2"
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
          <HomeWelcomeBubble text={buildCompactGreeting()} />

          <div className="flex w-full justify-end">
            <div className="flex w-full flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => chooseAudience('child')}
                className={PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS}
                aria-pressed={bridge.audience === 'child'}
              >
                Я - ребёнок
              </button>
              <button
                type="button"
                onClick={() => chooseAudience('adult')}
                className={PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS}
                aria-pressed={bridge.audience === 'adult'}
              >
                Я - взрослый
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
