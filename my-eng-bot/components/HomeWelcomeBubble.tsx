'use client'

import React from 'react'
import { splitGreetingIntoBlocks } from '@/lib/homeGreeting'
import { HomeWallpaperBubbleFrame, HOME_ASSISTANT_BUBBLE_CLASS } from '@/components/HomeWallpaperBubbleFrame'

type HomeWelcomeBubbleProps = {
  /** Текст: блоки через \\n\\n — приветствие, факт, приглашение (или 2 блока в компактном режиме) */
  text: string
  className?: string
}

/**
 * Отдельные пузыри для каждого блока текста (полный режим: приветствие → факт → приглашение).
 */
export default function HomeWelcomeBubble({ text, className = '' }: HomeWelcomeBubbleProps) {
  const blocks = React.useMemo(() => splitGreetingIntoBlocks(text), [text])

  const renderGreetingBlock = (block: string): React.ReactNode => {
    if (!block.includes('MyEng')) return block
    const parts = block.split('MyEng')
    return parts.reduce<React.ReactNode[]>((acc, part, index) => {
      if (part) acc.push(part)
      if (index < parts.length - 1) {
        acc.push(
          <strong key={`myeng-${index}`} className="font-semibold">
            MyEng
          </strong>
        )
      }
      return acc
    }, [])
  }

  return (
    <HomeWallpaperBubbleFrame ariaLabel="Приветствие MyEng" scrollable className={className}>
      {blocks.map((block, i) => (
        <div key={`${i}-${block.slice(0, 32)}`} className="flex justify-start">
          <div className={HOME_ASSISTANT_BUBBLE_CLASS}>
            <p className="break-words font-normal">{renderGreetingBlock(block)}</p>
          </div>
        </div>
      ))}
    </HomeWallpaperBubbleFrame>
  )
}
