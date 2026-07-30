import { parseTranslationCoachBlocks } from '@/components/Chat'
import { resolveTranslationProtocolStatusFromFields } from '@/lib/translationProtocolStatus'
import type { TranslationProtocolStatus } from '@/lib/translationProtocolStatus'
import type { TranslationStepOutcome } from '@/lib/translation/translationSessionEconomy'
import { hashTranslationAssistantKey } from '@/lib/translation/translationSessionEconomy'

export function resolveTranslationProtocolFromAssistantContent(
  content: string
): TranslationProtocolStatus {
  const blocks = parseTranslationCoachBlocks(content)
  return resolveTranslationProtocolStatusFromFields({
    ...blocks,
    rawContent: content,
  })
}

export function translationStepOutcomeFromProtocol(
  status: TranslationProtocolStatus
): TranslationStepOutcome | null {
  if (status === 'success') return 'success'
  if (status === 'soft_fail_advance') return 'soft_fail'
  return null
}

export function resolveTranslationStepAward(content: string): {
  outcome: TranslationStepOutcome
  assistantKey: string
  protocolStatus: TranslationProtocolStatus
} | null {
  const protocolStatus = resolveTranslationProtocolFromAssistantContent(content)
  const outcome = translationStepOutcomeFromProtocol(protocolStatus)
  if (!outcome) return null
  return {
    outcome,
    assistantKey: hashTranslationAssistantKey(content),
    protocolStatus,
  }
}
