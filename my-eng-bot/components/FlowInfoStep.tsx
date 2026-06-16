'use client'

import FlowInfoCard, { type FlowInfoCardProps } from '@/components/FlowInfoCard'
import ProgressCtaButton from '@/components/ProgressCtaButton'
import { useMountTapGuard } from '@/hooks/useMountTapGuard'
import {
  APP_BTN_PRIMARY_DUAL_ROW,
  APP_BTN_PRIMARY_LARGE,
  APP_BTN_SECONDARY_DUAL_ROW,
  APP_BTN_SECONDARY_LARGE,
} from '@/lib/homeCtaStyles'
import { LESSON_BRIEFING_PREPARE_GHOST_LABEL } from '@/lib/lessonBriefingPrepareProgressCopy'
import { formatLessonVariantDualCtaTwoLineLabel } from '@/lib/lessonVariantCtaCopy'

export type FlowInfoStepProps = FlowInfoCardProps & {
  actionLabel?: string
  onAction: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  secondaryActionDisabled?: boolean
  /** Secondary сверху с тёмно-синим стилем (например «Новый вариант»). */
  prioritizeSecondaryAction?: boolean
  ariaLabel?: string
  cardClassName?: string
  /** Класс анимации только карточки. Кнопка остаётся на месте. */
  enterClassName?: string
  /** Отступ карточка → CTA как pt-2.5 композера, без border-t. */
  compactActionsSpacing?: boolean
  /** Две CTA в один ряд, симметрично, текст в две строки. */
  dualActionsRow?: boolean
  /** Прогресс на dual CTA «Новый вариант» (брифинг). */
  generateVariantBusy?: boolean
  generateVariantProgress?: number
  generateVariantLabel?: string
  generateVariantGhostLabel?: string
  /** Ключ шага: блокирует CTA сразу после mount (защита от сквозного тапа на мобильных). */
  guardMountTapResetKey?: string
}

export default function FlowInfoStep({
  actionLabel = 'Далее',
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionDisabled = false,
  prioritizeSecondaryAction = false,
  ariaLabel = 'Информационный шаг',
  cardClassName = 'mb-0 shadow-md',
  enterClassName = 'animate-fade-in-up',
  compactActionsSpacing = false,
  dualActionsRow = false,
  generateVariantBusy = false,
  generateVariantProgress,
  generateVariantLabel,
  generateVariantGhostLabel = LESSON_BRIEFING_PREPARE_GHOST_LABEL,
  guardMountTapResetKey,
  className: _unusedClassName,
  ...cardProps
}: FlowInfoStepProps) {
  const { isActionReady, guardAction } = useMountTapGuard(guardMountTapResetKey)
  const hasSecondary = Boolean(secondaryActionLabel && onSecondaryAction)
  const primaryButtonClass = `${APP_BTN_PRIMARY_LARGE} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd]`
  const secondaryButtonClass = `${APP_BTN_SECONDARY_LARGE} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd]`
  const primaryDualRowClass = `${APP_BTN_PRIMARY_DUAL_ROW} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd]`
  const secondaryDualRowClass = `${APP_BTN_SECONDARY_DUAL_ROW} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd]`
  const generateVariantDualRowClass = primaryDualRowClass
  const showGenerateVariantProgress =
    dualActionsRow && prioritizeSecondaryAction && generateVariantProgress !== undefined

  const renderDualRowButton = (
    label: string,
    onClick: () => void,
    disabled: boolean,
    tone: 'primary' | 'secondary'
  ) => (
    <button
      type="button"
      onClick={() => guardAction(onClick)}
      disabled={disabled || !isActionReady}
      className={tone === 'primary' ? primaryDualRowClass : secondaryDualRowClass}
    >
      {formatLessonVariantDualCtaTwoLineLabel(label)}
    </button>
  )

  const renderGenerateVariantDualButton = () => (
    <ProgressCtaButton
      className={generateVariantDualRowClass}
      onClick={() => guardAction(() => onSecondaryAction?.())}
      disabled={secondaryActionDisabled || !isActionReady || generateVariantBusy}
      busy={generateVariantBusy}
      progress={generateVariantBusy ? generateVariantProgress : null}
      ghostLabel={generateVariantBusy && generateVariantLabel ? generateVariantLabel : generateVariantGhostLabel}
    >
      {generateVariantBusy
        ? generateVariantLabel
        : formatLessonVariantDualCtaTwoLineLabel(secondaryActionLabel!)}
    </ProgressCtaButton>
  )

  const emphasizedButton =
    hasSecondary && prioritizeSecondaryAction ? (
      <button
        type="button"
        onClick={() => guardAction(() => onSecondaryAction?.())}
        disabled={secondaryActionDisabled || !isActionReady}
        className={primaryButtonClass}
      >
        {secondaryActionLabel}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => guardAction(onAction)}
        disabled={!isActionReady}
        className={primaryButtonClass}
      >
        {actionLabel}
      </button>
    )

  const deemphasizedButton =
    hasSecondary && prioritizeSecondaryAction ? (
      <button
        type="button"
        onClick={() => guardAction(onAction)}
        disabled={!isActionReady}
        className={secondaryButtonClass}
      >
        {actionLabel}
      </button>
    ) : hasSecondary ? (
      <button
        type="button"
        onClick={() => guardAction(() => onSecondaryAction?.())}
        disabled={secondaryActionDisabled || !isActionReady}
        className={secondaryButtonClass}
      >
        {secondaryActionLabel}
      </button>
    ) : null

  const dualRowActions =
    hasSecondary && dualActionsRow ? (
      <>
        {prioritizeSecondaryAction ? (
          <>
            {showGenerateVariantProgress
              ? renderGenerateVariantDualButton()
              : renderDualRowButton(
                  secondaryActionLabel!,
                  onSecondaryAction!,
                  secondaryActionDisabled,
                  'primary'
                )}
            {renderDualRowButton(actionLabel, onAction, generateVariantBusy, 'secondary')}
          </>
        ) : (
          <>
            {renderDualRowButton(actionLabel, onAction, generateVariantBusy, 'primary')}
            {renderDualRowButton(
              secondaryActionLabel!,
              onSecondaryAction!,
              secondaryActionDisabled || generateVariantBusy,
              'secondary'
            )}
          </>
        )}
      </>
    ) : null

  const stackedActions =
    hasSecondary && !dualActionsRow ? (
      <>
        {emphasizedButton}
        {deemphasizedButton}
      </>
    ) : !hasSecondary ? (
      emphasizedButton
    ) : null

  /** Как `lessonMenuFooterRegionClass` в MenuSectionPanels: отступ карточки от CTA. */
  const actionsFooterClass = compactActionsSpacing
    ? dualActionsRow && hasSecondary
      ? 'flex w-full flex-row gap-2'
      : 'flex flex-col gap-2'
    : dualActionsRow && hasSecondary
      ? 'flex w-full flex-row gap-2 border-t border-[var(--border)]/70 pt-2'
      : 'flex flex-col gap-2 border-t border-[var(--border)]/70 pt-2'

  return (
    <div
      className={`mx-auto flex w-full max-w-sm flex-col ${compactActionsSpacing ? 'gap-2.5' : 'gap-2'}`}
      role="region"
      aria-label={ariaLabel}
    >
      <div className={enterClassName}>
        <FlowInfoCard {...cardProps} className={cardClassName} />
      </div>
      <div className={actionsFooterClass}>{dualRowActions ?? stackedActions}</div>
    </div>
  )
}
