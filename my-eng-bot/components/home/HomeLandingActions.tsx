'use client'

import VocabCard from '@/components/vocabulary/VocabCard'
import VocabCardFooterButton from '@/components/vocabulary/VocabCardFooterButton'
import HubNavCard from '@/components/nav/HubNavCard'
import { APP_SHELL_HOME_COPY } from '@/lib/uiCopy/appShellCopy'
import {
  PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS,
  PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS,
} from '@/lib/homeCtaStyles'
import { VOCAB_CARD_BODY_REASON } from '@/lib/vocabulary/cardStyles'
import type { Audience } from '@/lib/types'

type Props = {
  audienceChosen: boolean
  audience: Audience
  onChooseChild: () => void
  onChooseAdult: () => void
  onStart: () => void
  onOpenSections?: () => void
}

export default function HomeLandingActions({
  audienceChosen,
  audience,
  onChooseChild,
  onChooseAdult,
  onStart,
  onOpenSections,
}: Props) {
  if (!audienceChosen) {
    return (
      <div className="flex w-full justify-end">
        <div className="flex w-full flex-col items-end gap-2">
          <button type="button" onClick={onChooseChild} className={PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS}>
            {APP_SHELL_HOME_COPY.audienceChildLabel}
          </button>
          <button type="button" onClick={onChooseAdult} className={PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS}>
            {APP_SHELL_HOME_COPY.audienceAdultLabel}
          </button>
        </div>
      </div>
    )
  }

  const child = audience === 'child'
  return (
    <div className="flex w-full flex-col gap-2">
      <VocabCard
        className="w-full"
        title={APP_SHELL_HOME_COPY.doorTitle}
        insetCta={
          <VocabCardFooterButton
            variant="launch"
            placement="inset"
            label={child ? APP_SHELL_HOME_COPY.doorPlay : APP_SHELL_HOME_COPY.doorStart}
            onClick={onStart}
          />
        }
      >
        <p className={VOCAB_CARD_BODY_REASON}>
          {child ? APP_SHELL_HOME_COPY.doorBodyChild : APP_SHELL_HOME_COPY.doorBodyAdult}
        </p>
      </VocabCard>
      {onOpenSections ? (
        <HubNavCard
          title={APP_SHELL_HOME_COPY.sectionsLabel}
          ariaLabel={`${APP_SHELL_HOME_COPY.sectionsLabel}. ${APP_SHELL_HOME_COPY.sectionsHint}`}
          onClick={onOpenSections}
        >
          <p className={VOCAB_CARD_BODY_REASON}>{APP_SHELL_HOME_COPY.sectionsHint}</p>
        </HubNavCard>
      ) : null}
    </div>
  )
}
