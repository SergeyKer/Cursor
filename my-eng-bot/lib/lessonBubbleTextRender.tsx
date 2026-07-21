import { LESSON_HIGHLIGHT_EXACT_REGEX, LESSON_HIGHLIGHT_SPLIT_REGEX } from '@/lib/lessonHighlightPhrases'

export const TASK_INSTRUCTION_EMPHASIS_CLASS = 'font-semibold text-[var(--chat-label-main)]'

export const LESSON_TASK_IMPERATIVE_VERBS = [
  'Переведите',
  'Переведи',
  'Скажите',
  'Скажи',
  'Выберите',
  'Выбери',
  'Впишите',
  'Впиши',
  'Дополните',
  'Дополни',
  'Расставьте',
  'Расставь',
  'Напишите',
  'Напиши',
  'Соберите',
  'Собери',
  'Постройте',
  'Построй',
  'Восстановите',
  'Восстанови',
  'Прослушайте',
  'Прослушай',
  'Ответьте',
  'Ответь',
  'Найдите',
  'Найди',
  'Поправьте',
  'Поправь',
] as const

const TASK_IMPERATIVE_PATTERN = [...LESSON_TASK_IMPERATIVE_VERBS]
  .sort((a, b) => b.length - a.length)
  .map((verb) => verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')

const TASK_IMPERATIVE_REGEX = new RegExp(`^(${TASK_IMPERATIVE_PATTERN})(\\s*)(.*)$`, 'u')

export function normalizeTranslatePromptPunctuation(text: string): string {
  return text.replace(/(Переведите на английский:\s*"[^"\n]*")([.!?…]+)/g, '$1')
}

export function splitLabel(line: string): { label: string; rest: string } | null {
  const match = /^([^:]{2,28}):\s*(.+)$/.exec(line)
  if (!match) return null
  return { label: match[1], rest: match[2] }
}

export function splitLeadingTaskImperative(line: string): { verb: string; rest: string } | null {
  const match = TASK_IMPERATIVE_REGEX.exec(line)
  if (!match) return null
  return { verb: match[1], rest: `${match[2]}${match[3]}` }
}

const TRAILING_ROLEPLAY_TASK_LABELS = ['Скажите ответ', 'Скажи ответ'] as const

export function splitTrailingTaskImperative(line: string): { body: string; imperative: string } | null {
  if (!/Собеседник:/u.test(line)) return null

  for (const label of TRAILING_ROLEPLAY_TASK_LABELS) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = new RegExp(`^(.*?)\\s+(${escaped})([.!?…]*)$`, 'u').exec(line.trim())
    if (!match) continue
    const punctuation = match[3] || '.'
    return { body: match[1].trimEnd(), imperative: `${match[2]}${punctuation}` }
  }

  return null
}

function renderHighlightedCorePhrases(text: string) {
  const parts = text.split(LESSON_HIGHLIGHT_SPLIT_REGEX)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    LESSON_HIGHLIGHT_EXACT_REGEX.test(part) ? (
      <strong key={`${part}-${index}`} className={TASK_INSTRUCTION_EMPHASIS_CLASS}>
        {part}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  )
}

export function renderTaskInstructionText(text: string) {
  const trailing = splitTrailingTaskImperative(text)
  if (trailing) {
    return (
      <>
        {trailing.body}{' '}
        <span className={TASK_INSTRUCTION_EMPHASIS_CLASS}>{trailing.imperative}</span>
      </>
    )
  }

  const label = splitLabel(text)
  if (label) {
    return (
      <>
        <span className={TASK_INSTRUCTION_EMPHASIS_CLASS}>{label.label}:</span> {label.rest}
      </>
    )
  }

  const imperative = splitLeadingTaskImperative(text)
  if (imperative) {
    return (
      <>
        <span className={TASK_INSTRUCTION_EMPHASIS_CLASS}>{imperative.verb}</span>
        {imperative.rest}
      </>
    )
  }

  return renderHighlightedCorePhrases(text)
}

function renderPlainInstructionText(text: string) {
  const label = splitLabel(text)
  if (label) {
    return (
      <>
        <span className={TASK_INSTRUCTION_EMPHASIS_CLASS}>{label.label}:</span> {label.rest}
      </>
    )
  }

  return renderHighlightedCorePhrases(text)
}

export type LessonBubbleBulletStyle = 'badge' | 'dot'

export type RenderBubbleContentOptions = {
  emphasizeTaskInstructions?: boolean
  bulletStyle?: LessonBubbleBulletStyle
}

export function renderBodyLine(
  line: string,
  index: number,
  options?: Pick<RenderBubbleContentOptions, 'emphasizeTaskInstructions' | 'bulletStyle'>
) {
  if (!line.trim()) {
    return <div key={index} className="h-1" aria-hidden />
  }

  const markerMatch = /^(•|✓|🎯|🧭|⚠️)\s*(.+)$/.exec(line)
  const marker = markerMatch?.[1]
  const text = markerMatch?.[2] ?? line
  const bulletStyle = options?.bulletStyle ?? 'badge'
  const useDotBullet = bulletStyle === 'dot' && marker === '•'

  return (
    <div key={index} className="flex gap-2 text-[15px] leading-[1.45] text-[var(--text)]">
      {useDotBullet ? (
        <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" aria-hidden />
      ) : marker ? (
        <span className="emoji-glyph mt-[0.15rem] inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-[12px] shadow-sm">
          {marker}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        {options?.emphasizeTaskInstructions
          ? renderTaskInstructionText(text)
          : renderPlainInstructionText(text)}
      </span>
    </div>
  )
}

export function splitBubbleTitleBody(content: string): { title: string; bodyLines: string[] } {
  const [title, ...bodyLines] = normalizeTranslatePromptPunctuation(content).split('\n')
  return { title, bodyLines }
}

export function renderBubbleContent(content: string, options?: RenderBubbleContentOptions) {
  const { title, bodyLines } = splitBubbleTitleBody(content)

  if (bodyLines.length === 0) {
    return (
      <div className="break-words text-[15px] leading-[1.45] text-[var(--text)]">
        {options?.emphasizeTaskInstructions ? renderTaskInstructionText(title) : title}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="break-words text-[13px] font-semibold uppercase tracking-[0.02em] text-[var(--chat-label-main)]">
        {title}
      </div>
      <div className="space-y-1.5">
        {bodyLines.map((line, i) => renderBodyLine(line, i, options))}
      </div>
    </div>
  )
}
