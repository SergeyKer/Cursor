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

function getAdultDotClassName(tone: FooterVoiceTone, emphasis: FooterVoiceEmphasis): string {
  const toneClassName =
    tone === 'celebrate'
      ? 'bg-emerald-500'
      : tone === 'support'
        ? 'bg-emerald-400'
        : tone === 'hint'
          ? 'bg-amber-400'
          : tone === 'thinking'
            ? 'bg-sky-400'
            : tone === 'error'
              ? 'bg-rose-400'
              : 'bg-gray-400'

  const emphasisClassName = emphasis === 'pulse' ? 'motion-safe:animate-pulse' : ''
  return `mt-0.5 h-2 w-2 shrink-0 rounded-full ${toneClassName} ${emphasisClassName}`.trim()
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
      bottomLineClassName: 'text-[10px] font-medium text-gray-400 sm:text-xs',
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
      bottomLineClassName: 'text-[11px] font-semibold text-[var(--chat-label-main)] sm:text-xs',
      markerKind: 'emoji',
      markerText,
      markerClassName: `shrink-0 text-base leading-none ${emphasis === 'pulse' ? 'motion-safe:animate-pulse' : ''}`.trim(),
    }
  }

  return {
    enabled: true,
    mode: 'professional',
    typingSpeed: 28,
    topLineRowClassName: 'flex items-center gap-2',
    topLineClassName,
    bottomLineClassName: 'text-[10px] font-medium tracking-wide text-gray-400 sm:text-xs',
    markerKind: 'dot',
    markerText: null,
    markerClassName: getAdultDotClassName(tone, emphasis),
  }
}
