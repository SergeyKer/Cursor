'use client'

import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'
import type { Audience } from '@/lib/types'

export type FooterPresentationMode = 'playful' | 'professional'
export type FooterMarkerKind = 'emoji' | 'none'

export interface FooterPresentation {
  enabled: boolean
  mode: FooterPresentationMode
  typingSpeed: number
  topLineRowClassName: string
  topLineClassName: string
  /** Горизонтальный отступ нижней строки, чтобы совпадать с началом текста верхней (после маркера / мягкого pl верхней строки). */
  bottomLineRowClassName: string
  bottomLineClassName: string
  markerKind: FooterMarkerKind
  markerText: string | null
  markerClassName: string
}

interface ResolveFooterPresentationParams {
  audience: Audience
  tone: FooterVoiceTone
  emphasis: FooterVoiceEmphasis
  typingKey?: string | number | null
  text?: string | null
  /** Без эмодзи слева от верхней строки (например, статусы звонка Engvo). */
  hideDynamicMarker?: boolean
}

const ADAPTIVE_FOOTER_PRESENTATION_ENABLED = process.env.NEXT_PUBLIC_ADAPTIVE_FOOTER_PRESENTATION !== '0'

/** Нижняя строка статов - тот же размер, что в structured lesson footer. */
const FOOTER_BOTTOM_LINE_CLASS = 'text-[13px] leading-none text-gray-400'

export const CHILD_EMOJI_BY_TONE: Record<FooterVoiceTone, readonly string[]> = {
  celebrate: ['🎉', '✨', '🌟', '🏆', '😄', '🤩', '😊'],
  support: ['💪', '🤝', '🌈', '🙌', '🤗', '😌', '💛', '😇', '😁'],
  hint: ['💡', '🧩', '🔍', '📝', '🧐', '😉'],
  thinking: ['🤔', '🧠', '🔎', '📘', '😕', '😮', '💭'],
  error: ['💛', '🛟', '🌱', '🤝', '😔', '🥲'],
  neutral: ['😊', '😄', '👋', '✨', '🌤️', '💚'],
}

/** Маркер футера в режиме «Общение» (говори на En/Ru…). */
export const COMMUNICATION_FOOTER_MARKER = '😊'

export const ADULT_EMOJI_BY_TONE: Record<FooterVoiceTone, readonly string[]> = {
  celebrate: ['😊', '😄', '🤩', '✨', '🌟', '💚'],
  support: ['🙂', '🤗', '😌', '🤝', '💛', '🙏', '😇', '😁'],
  hint: ['🧐', '😉', '💡', '📝', '🔎'],
  thinking: ['🤔', '😕', '😮', '💭', '☁️'],
  error: ['😔', '🥲', '😕', '💛', '🛟', '🌱'],
  neutral: ['😊', '😄', '👋', '✨', '🌤️', '💚'],
}

function getToneTextClassName(tone: FooterVoiceTone, emphasis: FooterVoiceEmphasis, isPlayful: boolean): string {
  const toneClassName =
    tone === 'celebrate'
      ? 'font-semibold text-emerald-700'
      : tone === 'support'
        ? 'text-emerald-700'
        : tone === 'hint'
          ? 'text-amber-700'
          : tone === 'thinking'
            ? 'text-sky-700'
            : tone === 'error'
              ? 'text-rose-700'
              : 'text-[var(--text-muted,#6b7280)]'

  const emphasisClassName = emphasis === 'pulse' ? 'motion-safe:animate-pulse' : ''
  const playfulClassName = isPlayful ? 'font-medium' : ''
  return `${toneClassName} ${emphasisClassName} ${playfulClassName}`.trim()
}

function stableHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function pickStableItem(items: readonly string[], seed: string): string {
  if (items.length === 0) return ''
  const index = stableHash(seed) % items.length
  return items[index] ?? items[0] ?? ''
}

function resolveMarkerSeed(
  typingKey: string | number | null | undefined,
  text: string | null | undefined,
  tone: FooterVoiceTone,
  audience: Audience
): string {
  return String(typingKey ?? `${text ?? ''}|${tone}|${audience}`)
}

function resolveEmojiMarker(audience: Audience, tone: FooterVoiceTone, seed: string): string {
  if (seed.startsWith('chat-communication')) {
    return COMMUNICATION_FOOTER_MARKER
  }
  const pool = audience === 'child' ? CHILD_EMOJI_BY_TONE : ADULT_EMOJI_BY_TONE
  return pickStableItem(pool[tone], seed)
}

function buildMarkerClassName(emphasis: FooterVoiceEmphasis): string {
  return `footer-dynamic-marker ${emphasis === 'pulse' ? 'motion-safe:animate-pulse' : ''}`.trim()
}

export function resolveFooterPresentation({
  audience,
  tone,
  emphasis,
  typingKey,
  text,
  hideDynamicMarker = false,
}: ResolveFooterPresentationParams): FooterPresentation {
  const isPlayful = audience === 'child'
  const topLineClassName = getToneTextClassName(tone, emphasis, isPlayful)

  if (!ADAPTIVE_FOOTER_PRESENTATION_ENABLED) {
    return {
      enabled: false,
      mode: isPlayful ? 'playful' : 'professional',
      typingSpeed: 40,
      topLineRowClassName: 'flex h-full min-w-0 items-center gap-2',
      topLineClassName,
      bottomLineRowClassName: '',
      bottomLineClassName: FOOTER_BOTTOM_LINE_CLASS,
      markerKind: 'none',
      markerText: null,
      markerClassName: '',
    }
  }

  const seed = resolveMarkerSeed(typingKey, text, tone, audience)
  const markerText = hideDynamicMarker ? null : resolveEmojiMarker(audience, tone, seed)
  const markerClassName = buildMarkerClassName(emphasis)
  const markerKind: FooterMarkerKind = hideDynamicMarker || !markerText ? 'none' : 'emoji'

  if (isPlayful) {
    return {
      enabled: true,
      mode: 'playful',
      typingSpeed: 44,
      topLineRowClassName:
        'flex h-full min-w-0 items-center gap-2 overflow-hidden pl-1',
      topLineClassName,
      bottomLineRowClassName: hideDynamicMarker ? '' : 'pl-2',
      bottomLineClassName: FOOTER_BOTTOM_LINE_CLASS,
      markerKind,
      markerText,
      markerClassName: markerKind === 'emoji' ? markerClassName : '',
    }
  }

  return {
    enabled: true,
    mode: 'professional',
    typingSpeed: 28,
    topLineRowClassName: 'flex h-full min-w-0 items-center gap-2 overflow-hidden',
    topLineClassName,
    bottomLineRowClassName: hideDynamicMarker ? '' : 'pl-2',
    bottomLineClassName: FOOTER_BOTTOM_LINE_CLASS,
    markerKind,
    markerText,
    markerClassName: markerKind === 'emoji' ? markerClassName : '',
  }
}
