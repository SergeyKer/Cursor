/** Разбивает нижнюю строку футера по разделителю «|» для сеточной вёрстки без отображения палок. */
export function splitFooterStaticSegments(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return trimmed
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}
