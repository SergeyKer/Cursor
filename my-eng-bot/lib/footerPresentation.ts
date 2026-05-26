'use client'

import type { FooterVoiceEmphasis, FooterVoiceTone } from '@/lib/footerVoice'
import type { Audience } from '@/lib/types'

export type FooterPresentationMode = 'playful' | 'professional'
export type FooterMarkerKind = 'emoji' | 'dot' | 'none'

export interface FooterPresentation {
  enabled: boolean
  mode: FooterPresentationMode
  typingSpeed: number
  topLineRowClassName: string
  topLineClassName: string
  /** Горизонтальный отступ нижней строки, чтобы совпадать с началом текста верхней (после маркера / внутреннего padding «таблетки»). */
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
}

const ADAPTIVE_FOOTER_PRESENTATION_ENABLED = process.env.NEXT_PUBLIC_ADAPTIVE_FOOTER_PRESENTATION !== '0'

/** Нижняя строка статов — тот же размер, что в structured lesson footer. */
const FOOTER_BOTTOM_LINE_CLASS = 'text-[13px] leading-normal text-gray-400'

const CHILD_EMOJI_BY_TONE: Record<FooterVoiceTone, string[]> = {
  celebrate: ['🎉', '✨', '🌟', '🏆'],
  support: ['💪', '🤝', '🌈', '🙌'],
  hint: ['💡', '🧩', '🔍', '📝'],
  thinking: ['🤔', '🧠', '🔎', '📘'],
  error: ['💛', '🛟', '🌱', '🤝'],
  neutral: ['🙂', '👋', '✨', '🌤️'],
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

function pickStableItem(items: string[], seed: string): string {
  if (items.length === 0) return ''
  const index = stableHash(seed) % items.length
  return items[index] ?? items[0] ?? ''
}

export function resolveFooterPresentation({
  audience,
  tone,
  emphasis,
  typingKey,
  text,
}: ResolveFooterPresentationParams): FooterPresentation {
  const isPlayful = audience === 'child'
  const topLineClassName = getToneTextClassName(tone, emphasis, isPlayful)

  if (!ADAPTIVE_FOOTER_PRESENTATION_ENABLED) {
    return {
      enabled: false,
      mode: isPlayful ? 'playful' : 'professional',
      typingSpeed: 40,
      topLineRowClassName: 'flex items-center gap-2',
      topLineClassName,
      bottomLineRowClassName: '',
      bottomLineClassName: FOOTER_BOTTOM_LINE_CLASS,
      markerKind: 'none',
      markerText: null,
      markerClassName: '',
    }
  }

  if (isPlayful) {
    const seed = String(typingKey ?? `${text ?? ''}|${tone}|${audience}`)
    const markerText = pickStableItem(CHILD_EMOJI_BY_TONE[tone], seed)
    return {
      enabled: true,
      mode: 'playful',
      typingSpeed: 44,
      topLineRowClassName: 'flex items-center gap-2 rounded-full bg-white/35 px-2 backdrop-blur-[2px]',
      topLineClassName,
      bottomLineRowClassName: 'pl-2',
      bottomLineClassName: FOOTER_BOTTOM_LINE_CLASS,
      markerKind: 'emoji',
      markerText,
      markerClassName: `emoji-glyph shrink-0 text-base ${emphasis === 'pulse' ? 'motion-safe:animate-pulse' : ''}`.trim(),
    }
  }

  return {
    enabled: true,
    mode: 'professional',
    typingSpeed: 28,
    topLineRowClassName: 'flex min-w-0 items-center gap-2',
    topLineClassName,
    bottomLineRowClassName: '',
    bottomLineClassName: FOOTER_BOTTOM_LINE_CLASS,
    markerKind: 'none',
    markerText: null,
    markerClassName: '',
  }
}
