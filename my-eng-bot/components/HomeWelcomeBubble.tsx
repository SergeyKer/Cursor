'use client'

import React from 'react'
import { splitGreetingIntoBlocks } from '@/lib/homeGreeting'
import { HomeWallpaperBubbleFrame, HOME_ASSISTANT_BUBBLE_CLASS } from '@/components/HomeWallpaperBubbleFrame'

type HomeWelcomeBubbleProps = {
  /** Текст: блоки через \\n\\n — приветствие и приглашение */
  text: string
  className?: string
}

/**
 * Отдельные пузыри для каждого блока текста (приветствие → приглашение).
 */
export default function HomeWelcomeBubble({ text, className = '' }: HomeWelcomeBubbleProps) {
  const blocks = React.useMemo(() => splitGreetingIntoBlocks(text), [text])

  const brandName = 'Engvo.AI'

  const renderGreetingBlock = (block: string): React.ReactNode => {
    if (!block.includes(brandName)) return block
    const parts = block.split(brandName)
    return parts.reduce<React.ReactNode[]>((acc, part, index) => {
      if (part) acc.push(part)
      if (index < parts.length - 1) {
        acc.push(
          <strong key={`brand-${index}`} className="font-semibold">
            {brandName}
          </strong>
        )
      }
      return acc
    }, [])
  }

  return (
    <HomeWallpaperBubbleFrame ariaLabel="Приветствие Engvo.AI" scrollable className={className}>
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
