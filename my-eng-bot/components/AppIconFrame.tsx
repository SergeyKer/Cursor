'use client'

import Image from 'next/image'
import { iosSquircleBorderRadiusPercent } from '@/lib/squircleMask'

type AppIconFrameProps = {
  src: string
  alt: string
  /** Крупный ярлык на главной (squircle) или миниатюра в шапке (как кнопка меню). */
  variant: 'home' | 'header'
  className?: string
  priority?: boolean
  sizes?: string
}

const HOME_ICON_SHADOW =
  'shadow-[0_4px_14px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.08]'

export function AppIconFrame({
  src,
  alt,
  variant,
  className = '',
  priority = false,
  sizes,
}: AppIconFrameProps) {
  const isHome = variant === 'home'
  const defaultSizes = isHome ? '(max-width: 640px) 25vw, 6rem' : '40px'

  if (variant === 'header') {
    return (
      <span
        className={`app-header-mascot-icon relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden ${className}`}
        style={{ borderRadius: iosSquircleBorderRadiusPercent() }}
      >
        <Image
          src={src}
          alt={alt}
          width={512}
          height={512}
          className="block h-auto w-full max-h-full object-contain"
          sizes={sizes ?? defaultSizes}
          priority={priority}
        />
      </span>
    )
  }

  return (
    <div
      className={`home-ios-app-icon pointer-events-none relative overflow-hidden ${HOME_ICON_SHADOW} ${className}`}
      style={{ borderRadius: iosSquircleBorderRadiusPercent() }}
    >
      <Image
        src={src}
        alt={alt}
        width={512}
        height={512}
        className="block h-auto w-full object-contain"
        sizes={sizes ?? defaultSizes}
        priority={priority}
      />
    </div>
  )
}
