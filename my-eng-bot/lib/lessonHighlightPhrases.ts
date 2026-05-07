export const LESSON_HIGHLIGHT_PHRASES: readonly string[] = [
  "It's time to",
  'It’s time to',
  "It's",
  'It’s',
  'Do you know',
  "I don't know",
  'I do not know',
  'I know',
  'Can you say',
  'Tell me',
  'Who',
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const LESSON_HIGHLIGHT_PATTERN = LESSON_HIGHLIGHT_PHRASES
  .slice()
  .sort((left, right) => right.length - left.length)
  .map(escapeRegExp)
  .join('|')

export const LESSON_HIGHLIGHT_SPLIT_REGEX = new RegExp(`(${LESSON_HIGHLIGHT_PATTERN})`, 'g')
export const LESSON_HIGHLIGHT_EXACT_REGEX = new RegExp(`^(?:${LESSON_HIGHLIGHT_PATTERN})$`)
