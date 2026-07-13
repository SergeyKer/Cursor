import type { QuickTestTopicBank } from '@/lib/quickTest/types'

export function validateQuickTestBank(bank: QuickTestTopicBank): string[] {
  const errors: string[] = []
  if (!bank.slug || !bank.lessonId) errors.push(`${bank.slug || '?'}: missing slug/lessonId`)
  if (bank.variants.length === 0) errors.push(`${bank.slug}: no variants`)

  const variantIds = new Set<string>()
  for (const variant of bank.variants) {
    if (variantIds.has(variant.id)) errors.push(`${bank.slug}: duplicate variant ${variant.id}`)
    variantIds.add(variant.id)
    if (variant.questions.length !== 5) {
      errors.push(`${bank.slug}/${variant.id}: expected 5 questions, got ${variant.questions.length}`)
    }
    const questionIds = new Set<string>()
    variant.questions.forEach((question, index) => {
      if (questionIds.has(question.id)) {
        errors.push(`${bank.slug}/${variant.id}: duplicate question ${question.id}`)
      }
      questionIds.add(question.id)
      if (question.slot !== index + 1) {
        errors.push(`${bank.slug}/${question.id}: slot ${question.slot} != position ${index + 1}`)
      }
      if (question.options.length !== 3) {
        errors.push(`${bank.slug}/${question.id}: need 3 options`)
      }
      const uniqueOptions = new Set(question.options.map((o) => o.trim().toLowerCase()))
      if (uniqueOptions.size !== 3) {
        errors.push(`${bank.slug}/${question.id}: options must be unique`)
      }
      if (question.correctIndex < 0 || question.correctIndex > 2) {
        errors.push(`${bank.slug}/${question.id}: correctIndex out of range`)
      }
      if (!question.explanationRu.trim()) {
        errors.push(`${bank.slug}/${question.id}: empty explanationRu`)
      }
      if (!question.prompt.trim()) {
        errors.push(`${bank.slug}/${question.id}: empty prompt`)
      }
    })
  }
  return errors
}

export function validateAllQuickTestBanks(banks: QuickTestTopicBank[]): string[] {
  return banks.flatMap(validateQuickTestBank)
}
