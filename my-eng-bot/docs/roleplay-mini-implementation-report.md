# Roleplay-mini: отчёт о выполнении (Q&A формат)

**Дата:** 2026-07-08  
**Scope:** только тип 10 практики (`roleplay-mini`) и связанные алгоритмы.

## Цель

Переделать мини-диалог: в task-блоке — **русская вводная + английский вопрос собеседника**; grammar cue — только в info. Убрать translate-стиль (`Собеседник: «Темно.»`).

## Что сделано

### 1. Engine (`roleplayPromptEngine.ts`)

- `resolveRoleplayScenario` — единая точка генерации intro + EN-вопрос + axis
- `resolveRoleIntroRu` — вводные по урокам 1–4 из variant/step6/sourceSituations
- `resolveInterlocutorQuestionEn` — таблица EN-вопросов по `lessonId + axis`
- `resolveRoleplayTargetAnswer` — урок 2: из пары `Who…? + declarative` берётся только declarative
- `parseRoleIntroFromPrompt`, `formatRoleplayTaskDisplay` — парсинг и UI (одна строка, без `\n`)
- `buildCanonicalRoleplayPrompt` — `{introRu}\nСобеседник: «{EN?}»` (без `Ответьте по-английски…`)
- `isRoleplayAnswerSemanticallyAligned` — guard `темно` → reject `cold`
- `roleplayPromptHasContext` — требует intro RU + interlocutor EN с `?`

### 2. Pipeline

- `buildRoleplayPrompt.ts` — новый builder, обновлённые `ROLEPLAY_MINI_SYSTEM_RULES`
- `roleplaySessionContinuity.ts` — anchor prompt: intro + EN question от anchor
- `localPracticeBuilder.ts` — `resolveRoleplayTargetAnswer` для roleplay
- `normalizeAiPracticeQuestion.ts` — rebuild + нормализация target
- `enforceStepSpecs.ts` — без изменений логики (уже использует continuity)
- `buildPracticeDiversity.ts` — правила AI: intro RU + interlocutor EN `?`

### 3. UI feed

- `buildPracticeFeedMessages.ts` — `formatRoleplayTaskDisplay` (intro + собеседник в одной строке)

### 4. Валидация и dedup

- `roleplayAnswerValidation.ts` — слои: exact → minWords → no Cyrillic → Q-A type → semantic → keywords
- Challenge anchor: только exact (reject paraphrase после exact fail)
- `roleplaySessionDedup.ts` — `collectRecentRoleIntroLines`
- `pickFreshReferencePracticeQuestion.ts` — dedup intro + interlocutor + target
- `referenceFallbackQuestion.ts` — трекинг intro в Reference fallback

## Примеры эталона

**Урок 4, creative:**
```
info:  Ответьте в мини-диалоге. I am / I'm + роль.
task:  Вы студент. Собеседник: «Who are you?»
ответ: I am a student.
```

**Урок 2, action:**
```
info:  Subject + глагол с -s + объект
task:  Ваш брат любит чай. Собеседник: «Who likes tea?»
ответ: My brother likes tea.
```

**Урок 1, state:**
```
task:  На улице темно. Собеседник: «What's the weather like?»
ответ: It's dark. (reject: It's cold.)
```

## Тесты (регрессия)

| Файл | Что проверяет |
|------|----------------|
| `roleplayPromptEngine.test.ts` | RP-01, RP-03, RP-V01 (single-line display) |
| `roleplayAnswerValidation.test.ts` | RP-02, RP-04, RP-06, RP-07 |
| `buildPracticeFeedMessages.test.ts` | task bubble intro + EN `?`, no `\n` |
| `buildRoleplayPrompt.test.ts` | etalon уроков 1–4 |
| `roleplaySessionContinuity.test.ts` | RP-06 anchor |
| `localPracticeBuilder.test.ts` | challenge step 10 anchor |
| `referenceEtalon.contract.test.ts` | EN interlocutor, no RU in interlocutor |
| `roleplaySessionDedup.test.ts` | dedup intro + interlocutor |
| `buildPracticeFeedMessages.test.ts` (dictation/listening) | smoke non-roleplay без регрессий |

**Результат:** `308` test files / `2697` tests passed.

## Вне scope (не трогали)

- `PracticeQuestionRenderer`, `lessonBubbleTextRender`, уроки, режим «Диалог»
- AppShell / API payload shape (опциональный 6-й аргумент dedup с default `[]`)
- Другие типы практики 1–9, 11–12

## Известные ограничения

- Урок 3: interlocutor — фиксированные шаблоны по variantIndex; при необходимости можно уточнить по `step6*Question` из variant
- Lesson 2 intro для easy без translate-quote в source — fallback «об однокласснице»
