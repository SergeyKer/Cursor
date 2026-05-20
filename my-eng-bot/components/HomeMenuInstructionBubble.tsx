'use client'

import React from 'react'
import { HomeWallpaperBubbleFrame, HOME_ASSISTANT_BUBBLE_CLASS } from '@/components/HomeWallpaperBubbleFrame'

type HomeMenuInstructionBubbleProps = {
  text: string
  ariaLabel?: string
}

/** Узкая колонка на iPhone: меньше кегль и плотнее интерлиньяж, до sm. */
const instructionBubbleClass = `${HOME_ASSISTANT_BUBBLE_CLASS} emoji-line max-w-full text-[13px] text-gray-900 sm:text-[15px]`

export function HomeMenuInstructionBubble({ text, ariaLabel = 'Инструкция по разделу' }: HomeMenuInstructionBubbleProps) {
  return (
    <HomeWallpaperBubbleFrame ariaLabel={ariaLabel} scrollable={false} className="w-full min-w-0 max-w-none">
      <div className="flex justify-start">
        <div className={instructionBubbleClass}>
          <p className="break-words font-normal">{text}</p>
        </div>
      </div>
    </HomeWallpaperBubbleFrame>
  )
}
