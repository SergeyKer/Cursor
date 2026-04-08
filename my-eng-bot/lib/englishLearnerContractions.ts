type ContractionRule = {
  pattern: RegExp
  replacement: string
}

const CONTRACTION_RULES: ContractionRule[] = [
  { pattern: /\bcannot\b/gi, replacement: "can't" },
  { pattern: /\bcan\s+not\b/gi, replacement: "can't" },
  { pattern: /\bwill\s+not\b/gi, replacement: "won't" },
  { pattern: /\bwould\s+not\b/gi, replacement: "wouldn't" },
  { pattern: /\bcould\s+not\b/gi, replacement: "couldn't" },
  { pattern: /\bshould\s+not\b/gi, replacement: "shouldn't" },
  { pattern: /\bmust\s+not\b/gi, replacement: "mustn't" },
  { pattern: /\bdo\s+not\b/gi, replacement: "don't" },
  { pattern: /\bdoes\s+not\b/gi, replacement: "doesn't" },
  { pattern: /\bdid\s+not\b/gi, replacement: "didn't" },
  { pattern: /\bI\s+am\s+not\b/gi, replacement: "I'm not" },
  { pattern: /\bis\s+not\b/gi, replacement: "isn't" },
  { pattern: /\bare\s+not\b/gi, replacement: "aren't" },
  { pattern: /\bwas\s+not\b/gi, replacement: "wasn't" },
  { pattern: /\bwere\s+not\b/gi, replacement: "weren't" },
  { pattern: /\bhave\s+not\b/gi, replacement: "haven't" },
  { pattern: /\bhas\s+not\b/gi, replacement: "hasn't" },
  { pattern: /\bhad\s+not\b/gi, replacement: "hadn't" },
]

function preserveLeadingCase(input: string, replacement: string): string {
  const first = input.match(/[A-Za-z]/)?.[0]
  if (!first) return replacement
  return first === first.toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement
}

export function normalizeEnglishLearnerContractions(text: string): string {
  if (!text) return text

  let out = text
  for (const rule of CONTRACTION_RULES) {
    out = out.replace(rule.pattern, (full) => preserveLeadingCase(full, rule.replacement))
  }
  return out
}
