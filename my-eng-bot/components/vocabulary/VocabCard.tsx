'use client'

import type { ReactNode } from 'react'
import {
  VOCAB_CARD_BODY,
  VOCAB_CARD_BODY_BEFORE_INSET,
  VOCAB_CARD_FOOTER_WRAP,
  VOCAB_CARD_HEADER,
  VOCAB_CARD_HEADER_TITLE,
  VOCAB_CARD_SURFACE,
  VOCAB_INSET_CTA_WRAP,
} from '@/lib/vocabulary/cardStyles'

type VocabCardProps = {
  title: string
  children?: ReactNode
  footer?: ReactNode
  /** Inset launch CTA (no divider). XOR footer — footer is ignored when set. */
  insetCta?: ReactNode
  className?: string
}

/** Vocab surface (no Progress chrome). Do not import Progress. */
export default function VocabCard({
  title,
  children,
  footer,
  insetCta,
  className = '',
}: VocabCardProps) {
  const useInset = insetCta != null
  return (
    <section className={`${VOCAB_CARD_SURFACE} ${className}`}>
      <div className={VOCAB_CARD_HEADER}>
        <p className={VOCAB_CARD_HEADER_TITLE}>{title}</p>
      </div>
      {children != null ? (
        <div className={useInset ? VOCAB_CARD_BODY_BEFORE_INSET : VOCAB_CARD_BODY}>{children}</div>
      ) : null}
      {useInset ? <div className={VOCAB_INSET_CTA_WRAP}>{insetCta}</div> : null}
      {!useInset && footer != null ? <div className={VOCAB_CARD_FOOTER_WRAP}>{footer}</div> : null}
    </section>
  )
}
