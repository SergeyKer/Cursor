'use client'

import type { ReactNode } from 'react'
import {
  MY_PLAN_CARD_BODY,
  MY_PLAN_CARD_FOOTER_WRAP,
  MY_PLAN_CARD_HEADER,
  MY_PLAN_CARD_HEADER_TITLE,
  MY_PLAN_CARD_SURFACE,
} from '@/lib/myPlan/cardStyles'

type MyPlanCardProps = {
  title: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/** Visual parity with ProgressCard v1; do not import Progress — intentional fork. */
export default function MyPlanCard({ title, children, footer, className = '' }: MyPlanCardProps) {
  return (
    <section className={`${MY_PLAN_CARD_SURFACE} ${className}`}>
      <div className={MY_PLAN_CARD_HEADER}>
        <p className={MY_PLAN_CARD_HEADER_TITLE}>{title}</p>
      </div>
      {children != null ? <div className={MY_PLAN_CARD_BODY}>{children}</div> : null}
      {footer != null ? <div className={MY_PLAN_CARD_FOOTER_WRAP}>{footer}</div> : null}
    </section>
  )
}
