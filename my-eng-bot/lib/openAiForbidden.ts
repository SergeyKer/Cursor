export function classifyOpenAiForbidden(errText: string): 'unsupported_region' | 'other' {
  try {
    const parsed = JSON.parse(errText) as { error?: { code?: string } }
    if (parsed?.error?.code === 'unsupported_country_region_territory') return 'unsupported_region'
  } catch {
    // ignore malformed JSON from upstream
  }
  if (/unsupported_country_region_territory/i.test(errText)) return 'unsupported_region'
  return 'other'
}
