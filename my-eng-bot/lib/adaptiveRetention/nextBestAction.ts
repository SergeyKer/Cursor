import { TOPIC_GOAL_PACKS } from '@/lib/adaptiveRetention/topicGoalPacks'
import type { DailyPlan, LearnerSnapshot, NextBestAction } from '@/types/adaptiveRetention'

function footer(params: {
  key: string
  dynamicText: string
  staticText: string
  tone?: NextBestAction['footer']['tone']
  emphasis?: NextBestAction['footer']['emphasis']
}): NextBestAction['footer'] {
  return {
    dynamicText: params.dynamicText,
    staticText: params.staticText,
    typingKey: params.key,
    tone: params.tone ?? 'neutral',
    emphasis: params.emphasis ?? 'none',
  }
}

function makeAction(action: Omit<NextBestAction, 'footer'> & { footer: NextBestAction['footer'] }): NextBestAction {
  return action
}

export function buildNextBestActions(snapshot: LearnerSnapshot): NextBestAction[] {
  const actions: NextBestAction[] = []

  if ((snapshot.daysSinceLastActive ?? 0) >= 3) {
    actions.push(makeAction({
      id: 'return-flow',
      kind: 'return_flow',
      title: 'Мягко вернуться',
      description: '2 слова и один быстрый вопрос без давления.',
      reason: 'Была пауза, поэтому начнём коротко и спокойно.',
      primaryCta: 'Вернуться за 2 минуты',
      target: { kind: 'return_flow' },
      priority: 100,
      footer: footer({
        key: 'adaptive-return-flow',
        dynamicText: 'Начнём мягко: 2 слова и вопрос.',
        staticText: 'Возвращение | 2 минуты',
        tone: 'support',
      }),
    }))
  }

  if (snapshot.vocabulary.dueWordCount > 0) {
    actions.push(makeAction({
      id: 'srs-review',
      kind: 'srs_review',
      title: 'Повторить слова',
      description: `${snapshot.vocabulary.dueWordCount} слов уже ждут повторения.`,
      reason: 'SRS подсказывает, что эти слова лучше вспомнить сегодня.',
      primaryCta: 'Повторить слова',
      target: { kind: 'vocabulary' },
      priority: 90,
      footer: footer({
        key: `adaptive-srs-${snapshot.vocabulary.dueWordCount}`,
        dynamicText: 'Сегодня лучше начать с повторения.',
        staticText: `Мой путь | ${snapshot.vocabulary.dueWordCount} слов ждут`,
        tone: 'hint',
      }),
    }))
  }

  if (snapshot.customPacks.latestPackId && snapshot.customPacks.latestPackTitle) {
    actions.push(makeAction({
      id: 'custom-pack-latest',
      kind: 'custom_pack',
      title: snapshot.customPacks.latestPackTitle,
      description: 'Продолжить свой список слов из домашнего задания или личной цели.',
      reason: 'Свои слова обычно важнее системного курса прямо сейчас.',
      primaryCta: 'Открыть свой список',
      target: { kind: 'custom_pack', packId: snapshot.customPacks.latestPackId },
      priority: 84,
      footer: footer({
        key: `adaptive-custom-${snapshot.customPacks.latestPackId}`,
        dynamicText: 'Свой список можно закрепить сейчас.',
        staticText: 'Свой список | Продолжить',
        tone: 'support',
      }),
    }))
  }

  if (snapshot.weakSpots.length > 0) {
    const weakSpot = snapshot.weakSpots[0]
    actions.push(makeAction({
      id: `weak-spot-${weakSpot?.id ?? 'main'}`,
      kind: 'weak_spot',
      title: weakSpot?.label ?? 'Слабое место',
      description: weakSpot?.actionHint ?? 'Закрепить трудный материал короткой практикой.',
      reason: weakSpot?.reason ?? 'Есть ошибки, которые стоит закрыть коротко.',
      primaryCta: 'Закрепить',
      target: { kind: 'practice', customTopic: weakSpot?.label },
      priority: 72,
      footer: footer({
        key: `adaptive-weak-${weakSpot?.id ?? 'main'}`,
        dynamicText: 'Закрепим то, что чаще выпадает.',
        staticText: 'Слабое место | 5 минут',
        tone: 'hint',
      }),
    }))
  }

  const defaultPack = snapshot.audience === 'adult'
    ? TOPIC_GOAL_PACKS.find((pack) => pack.id === 'airport-survival') ?? TOPIC_GOAL_PACKS[0]
    : TOPIC_GOAL_PACKS.find((pack) => pack.id === 'daily-small-talk') ?? TOPIC_GOAL_PACKS[0]
  if (defaultPack) {
    actions.push(makeAction({
      id: `topic-${defaultPack.id}`,
      kind: 'topic_pack',
      title: defaultPack.title,
      description: defaultPack.goal,
      reason: snapshot.hasAnyHistory ? 'Это короткая жизненная цель, которую легко продолжить.' : 'Это хороший первый шаг без долгой настройки.',
      primaryCta: 'Начать цель',
      target: { kind: 'topic_pack', packId: defaultPack.id },
      priority: snapshot.hasAnyHistory ? 55 : 80,
      footer: footer({
        key: `adaptive-topic-${defaultPack.id}`,
        dynamicText: `${defaultPack.title}: начнём с check.`,
        staticText: `${defaultPack.title} | ${defaultPack.estimatedMinutes} минут`,
        tone: 'neutral',
      }),
    }))
  }

  actions.push(makeAction({
    id: 'free-chat',
    kind: 'chat',
    title: 'Поговорить с Engvo',
    description: 'Открыть обычный чат и потренировать английский свободно.',
    reason: 'Свободный режим остаётся доступен в любой момент.',
    primaryCta: 'Открыть чат',
    target: { kind: 'chat' },
    priority: 20,
    footer: footer({
      key: 'adaptive-chat',
      dynamicText: 'Можно просто поговорить с Engvo.',
      staticText: 'Свободный режим',
      tone: 'neutral',
    }),
  }))

  return actions.sort((left, right) => right.priority - left.priority)
}

export function buildDailyPlan(snapshot: LearnerSnapshot): DailyPlan {
  const actions = buildNextBestActions(snapshot)
  const primaryAction = actions[0] ?? buildNextBestActions({ ...snapshot, hasAnyHistory: false, daysSinceLastActive: null })[0]
  if (!primaryAction) {
    throw new Error('Daily plan requires at least one action.')
  }
  const secondaryActions = actions.filter((action) => action.id !== primaryAction.id).slice(0, 2)
  const greeting = snapshot.hasAnyHistory
    ? 'Продолжим с того места, где будет полезнее всего.'
    : 'Начнём коротко: выберите цель или быстрый старт.'

  return {
    generatedAt: snapshot.generatedAt,
    greeting,
    primaryAction,
    secondaryActions,
    topicPacks: TOPIC_GOAL_PACKS,
    footer: primaryAction.footer,
  }
}
