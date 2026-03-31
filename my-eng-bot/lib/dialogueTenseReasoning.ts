type Audience = 'child' | 'adult'

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text))
}

function normalizeTenseContrastPunctuation(text: string): string {
  // "..., а не Past Simple; ..." -> "..., а не Past Simple — ..."
  return text.replace(
    /(,\s*а\s+не\s+(?:Present|Past|Future)\s+[A-Za-z ]{3,40})\s*;\s*/g,
    '$1 — '
  )
}

function buildTenseReasonByContext(params: {
  requiredTense: string
  audience: Audience
  userText: string
  repeatSentence: string
}): string {
  const { requiredTense, audience, userText, repeatSentence } = params
  const context = `${userText} ${repeatSentence}`.toLowerCase()

  switch (requiredTense) {
    case 'present_perfect': {
      if (hasAny(context, [/\b(already|just|yet|ever|never)\b/i])) {
        return audience === 'child'
          ? 'Здесь важно, что уже есть результат к этому моменту.'
          : 'Здесь фокус на результате к текущему моменту, поэтому нужен Present Perfect.'
      }
      if (hasAny(context, [/\b(recently|lately|so far)\b/i, /\bнедавно\b/i])) {
        return audience === 'child'
          ? 'Здесь говорим про недавний опыт к текущему моменту.'
          : 'Здесь речь о недавнем опыте к текущему моменту, поэтому нужен Present Perfect.'
      }
      return audience === 'child'
        ? 'Здесь важно, что получилось к этому моменту.'
        : 'В этом вопросе важен результат или опыт к текущему моменту.'
    }
    case 'present_perfect_continuous': {
      if (hasAny(context, [/\b(for|since|how long)\b/i, /\b(уже|в течение)\b/i])) {
        return audience === 'child'
          ? 'Здесь важно, как долго длится действие до этого момента.'
          : 'Здесь важна длительность процесса до текущего момента, поэтому нужен Present Perfect Continuous.'
      }
      return audience === 'child'
        ? 'Здесь важно, что действие длилось и связано с настоящим.'
        : 'Здесь важен процесс, который длился до текущего момента.'
    }
    case 'present_simple': {
      if (hasAny(context, [/\b(always|usually|often|sometimes|never|every)\b/i, /\b(обычно|часто|всегда|каждый)\b/i])) {
        return audience === 'child'
          ? 'Здесь говорим о том, что бывает обычно.'
          : 'Здесь речь о привычке или регулярности, поэтому нужен Present Simple.'
      }
      return audience === 'child'
        ? 'Здесь говорим о том, что обычно происходит.'
        : 'Здесь говорим о привычке, факте или регулярном действии.'
    }
    case 'present_continuous': {
      if (hasAny(context, [/\b(now|right now|at the moment|currently|today)\b/i, /\b(сейчас|в данный момент)\b/i])) {
        return audience === 'child'
          ? 'Здесь действие идет прямо сейчас.'
          : 'Здесь описывается процесс сейчас, поэтому нужен Present Continuous.'
      }
      return audience === 'child'
        ? 'Здесь действие идет прямо сейчас.'
        : 'Здесь действие происходит прямо сейчас или в текущий период.'
    }
    case 'past_simple': {
      if (hasAny(context, [/\b(yesterday|ago|last|in \d{4})\b/i, /\b(вчера|назад|прошл(ый|ую|ом))\b/i])) {
        return audience === 'child'
          ? 'Здесь действие уже закончилось в прошлом.'
          : 'Здесь действие завершилось в прошлом в конкретный период, поэтому нужен Past Simple.'
      }
      return audience === 'child'
        ? 'Здесь действие уже закончилось в прошлом.'
        : 'Здесь действие завершилось в прошлом в конкретное время.'
    }
    case 'future_simple':
      return audience === 'child'
        ? 'Здесь говорим о том, что будет потом.'
        : 'Здесь речь о планах или действиях в будущем.'
    default:
      return audience === 'child'
        ? 'Здесь важно сохранить время из вопроса.'
        : 'Здесь важно сохранить время, которое задано в вопросе.'
  }
}

function hasLearningReason(commentBody: string): boolean {
  return /\b(потому что|так как|когда|если|поэтому|в этом вопросе|по правилу)\b/i.test(commentBody)
}

function buildDialogueLearningHint(params: {
  commentBody: string
  requiredTense: string
  audience: Audience
  repeatSentence?: string | null
  userText?: string
}): string | null {
  const { commentBody, requiredTense, audience, repeatSentence = null, userText = '' } = params
  const body = commentBody.trim()
  if (!body || hasLearningReason(body)) return null
  if (/требуется|нужно.*(present|past|future)|ошибка времени|времени/i.test(body)) {
    return buildTenseReasonByContext({
      requiredTense,
      audience,
      userText,
      repeatSentence: repeatSentence ?? '',
    })
  }
  if (/артикл/i.test(body)) {
    if (/не нужен/i.test(body)) {
      return audience === 'child'
        ? 'Здесь артикль не нужен, потому что говорим в общем.'
        : 'Здесь артикль убираем, когда слово используется в общем значении.'
    }
    return audience === 'child'
      ? 'Здесь нужен артикль, потому что слово в единственном числе.'
      : 'Здесь нужен артикль, потому что речь о исчисляемом существительном в единственном числе.'
  }
  if (/\bhave\b|\bhas\b|подлежащ|согласован/i.test(body)) {
    const repeatLower = (repeatSentence ?? '').toLowerCase()
    const userLower = userText.toLowerCase()
    if (/\bhas\b/.test(repeatLower) && /\bhave\b/.test(userLower)) {
      return audience === 'child'
        ? 'С he/she/it используем has.'
        : 'После he/she/it используем has, а не have.'
    }
    if (/\bhave\b/.test(repeatLower) && /\bhas\b/.test(userLower)) {
      return audience === 'child'
        ? 'С I/you/we/they используем have.'
        : 'После I/you/we/they используем have, а не has.'
    }
    return audience === 'child'
      ? 'Форма have/has зависит от подлежащего.'
      : 'Форма have/has выбирается по подлежащему в конкретной конструкции.'
  }
  if (/\b-s\b|треть.*лиц|единственн|согласован/i.test(body)) {
    return audience === 'child'
      ? 'С he/she/it в Present Simple обычно нужен глагол с -s.'
      : 'В Present Simple при he/she/it глагол обычно принимает окончание -s.'
  }
  if (/орфограф|опечат/i.test(body)) {
    return audience === 'child'
      ? 'Так фраза звучит понятнее и правильнее.'
      : 'Так фраза звучит естественнее для носителя языка.'
  }
  if (/лексическ|слово/i.test(body)) {
    return audience === 'child'
      ? 'Такое слово точнее подходит к смыслу.'
      : 'Это слово точнее передает смысл в этом контексте.'
  }
  return null
}

export function enrichDialogueCommentWithLearningReason(params: {
  content: string
  requiredTense: string
  audience: Audience
  userText: string
  repeatSentence?: string | null
}): string {
  const { content, requiredTense, audience, userText, repeatSentence = null } = params
  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  if (commentIndex < 0) return content
  const raw = lines[commentIndex] ?? ''
  const body = raw.replace(/^Комментарий\s*:\s*/i, '').trim()
  if (!body) return content
  const hint = buildDialogueLearningHint({
    commentBody: body,
    requiredTense,
    audience,
    repeatSentence,
    userText,
  })
  const merged = hint ? `${body} ${hint}`.replace(/\s+/g, ' ').trim() : body
  const normalized = normalizeTenseContrastPunctuation(merged)
  if (!hint && normalized === body) return content
  lines[commentIndex] = `Комментарий: ${normalized}`
  return lines.join('\n').trim()
}
