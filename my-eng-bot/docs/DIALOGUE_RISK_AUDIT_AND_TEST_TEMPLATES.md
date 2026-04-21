# Аудит рисков и шаблоны тестов: `dialog`

## 1) Scope lock (зафиксированные границы)

- Область: только `dialogue/free_talk` ветка логики.
- Формат работ: только анализ, риски, тест-шаблоны, метрики и отчетный шаблон.
- Ограничение: без изменений бизнес-логики и без выхода за контур `dialog`.

Источники анализа:
- `app/api/chat/route.ts`
- `lib/freeTalkFirstQuestion.ts`
- `lib/freeTalkContextNextQuestion.ts`
- `lib/dialogueTenseInference.ts`
- `lib/dialogueTenseInference.test.ts`
- `lib/freeTalkFirstQuestion.test.ts`
- `lib/freeTalkContextNextQuestion.test.ts`
- `app/api/chat/route.translationLatency.diagnostic.test.ts` (как референс методики latency)

## 2) Реестр рисков (приоритизация)

### Critical

1. Риск раннего форсирования сложного времени без контекста  
   - Где: `app/api/chat/route.ts` (правила first free_talk turn + strict tense prompt).  
   - Симптом: сложный tense задан, но контекст еще не собран, вопрос выглядит искусственно или неестественно.  
   - Последствие: падение устойчивости диалога и доверия к алгоритму.

2. Риск дрейфа таймфрейма при коррекции  
   - Где: `app/api/chat/route.ts` (tense rule + timeframe lock), `lib/dialogueTenseInference.ts`.  
   - Симптом: вопрос задан в одном временном якоре, коррекция уходит в другой.  
   - Последствие: нарушение базового инварианта алгоритма.

### High

3. Риск потери темы при удержании сложного времени  
   - Где: `lib/freeTalkContextNextQuestion.ts`, `app/api/chat/route.ts`.  
   - Симптом: время соблюдается, но follow-up теряет исходную тему пользователя.  
   - Последствие: диалог формально корректный, но бесполезный.

4. Риск несоответствия `audience/level` при сложном tense  
   - Где: `app/api/chat/route.ts` (level/audience rules), `lib/freeTalkFirstQuestion.ts`.  
   - Симптом: для `child` или low CEFR появляются слишком взрослые конструкции/лексика.  
   - Последствие: регресс качества обучения и нарушение требований.

### Medium

5. Риск нестабильной точки старта применения required tense  
   - Где: `app/api/chat/route.ts` + связка с history.  
   - Симптом: в одинаковых условиях время начинает применяться на разном ходе.  
   - Последствие: непредсказуемое поведение, сложность отладки.

6. Риск деградации latency на длинных сериях сложных времен  
   - Где: API маршрут в `app/api/chat/route.ts`; методика замера из `route.translationLatency.diagnostic.test.ts`.  
   - Симптом: p95/p99 растут на сложных tense-сценариях.  
   - Последствие: ухудшение UX в реальном чате.

## 3) Метрика активации времени (когда ИИ начинает применять нужное время)

### Определения

- `turn_index_first_required_tense`: индекс первого сообщения ассистента, где вопрос определился как `requiredTense`.
- `user_turns_before_required_tense`: число пользовательских ходов до этого индекса.
- `activation_window_expected`: ожидаемое окно включения (`[min..max]`).

### Алгоритм вычисления

1. Пройти по сообщениям ассистента по порядку.  
2. На каждом сообщении вычислить время через `inferTenseFromDialogueAssistantContent(...)` из `lib/dialogueTenseInference.ts`.  
3. Найти первое совпадение с `requiredTense`.  
4. Зафиксировать `turn_index_first_required_tense` и `user_turns_before_required_tense`.  
5. Сравнить с ожидаемым окном.

### Базовый критерий pass/fail

- Pass: метрика попадает в `activation_window_expected`.
- Fail: не попадает или не найдено ни одного сообщения в `requiredTense`.

## 4) Метрика latency (диалоговый контур)

### Что меряем

- `single_turn_latency_ms` — единичный ход.
- `p50`, `p95`, `p99` — на серии вызовов.

### Методика

- Использовать mock provider с очередью фиксированных задержек.
- Для каждого запроса фиксировать `Date.now()` до/после `POST`.
- Считать percentile так же, как в `route.translationLatency.diagnostic.test.ts`.

### Базовые бюджеты (диагностические)

- `single_turn <= 3000 ms`
- `p50 <= 2500 ms`
- `p95 <= 5000 ms`
- `p99 <= 5000 ms`

Примечание: это стартовые диагностические пороги. Для production SLA пороги уточняются отдельно.

## 5) Шаблоны тестов (инварианты)

### Шаблон A: first-turn no-context guard

- Given: `topic=free_talk`, выбран сложный tense, история пустая.
- When: формируется первый вопрос.
- Then:
  - нет выдуманной конкретики;
  - вопрос соответствует стартовому формату;
  - зафиксирован baseline для activation-метрики.

### Шаблон B: tense activation turn index

- Given: пошаговая история `assistant/user/...`.
- When: на каждом assistant сообщении считается `inferTenseFromDialogueAssistantContent`.
- Then:
  - заполнены `turn_index_first_required_tense` и `user_turns_before_required_tense`;
  - результат в ожидаемом окне.

### Шаблон C: complex-time anchor consistency

- Given: `past_perfect`, `past_perfect_continuous`, `future_perfect`, `future_perfect_continuous`.
- When: пользователь отвечает со смещением временного якоря.
- Then: система не принимает ответ как корректный и возвращает коррекцию в нужном времени/якоре.

### Шаблон D: context retention under complex tense

- Given: 4-6 ходов по узкой теме.
- When: строятся follow-up вопросы.
- Then: одновременно удерживаются тема и выбранный tense.

### Шаблон E: audience + CEFR compliance

- Given: `audience=child`, `level=starter/a1/a2`, выбран сложный tense.
- When: генерируется вопрос/коррекция.
- Then: нет взрослой тематики, нет лексической перегрузки, стиль соответствует профилю.

### Шаблон F: dialogue latency diagnostics

- Given: серия вызовов с контролируемыми задержками.
- When: собираются latency samples.
- Then: считаются `p50/p95/p99`, сравниваются с бюджетом.

## 6) Матрица из 10 сценариев устойчивости (сложные времена)

1. `FT-01` first turn без контекста при `future_perfect`  
   - Инвариант: нет выдуманного контекста, стартовый формат корректен.

2. `FT-02` активация `future_perfect` после сбора минимального контекста  
   - Инвариант: `user_turns_before_required_tense` попадает в ожидаемое окно.

3. `FT-03` активация `past_perfect` после сбора минимального контекста  
   - Инвариант: метрика активации стабильна между прогонами.

4. `CT-01` `past_perfect` + зависимое событие (`before/by the time`)  
   - Инвариант: не деградирует в `past_simple`.

5. `CT-02` `past_perfect_continuous` + длительность до события  
   - Инвариант: не деградирует в `past_perfect`.

6. `CT-03` `future_perfect` + дедлайн  
   - Инвариант: не деградирует в `future_simple`.

7. `CT-04` `future_perfect_continuous` + длительность к дедлайну  
   - Инвариант: не деградирует в `future_perfect`.

8. `CR-01` mismatch timeframe в ответе пользователя  
   - Инвариант: ответ не принимается как корректный; коррекция остается в якоре вопроса.

9. `CX-01` удержание темы на 4-6 ходах под сложным tense  
   - Инвариант: тема не распадается, follow-up не уходит в generic.

10. `UX-01` child/low-level guard под сложным tense + latency  
   - Инварианты: стиль и лексика в рамках `child + level`, latency в порогах p50/p95/p99.

## 7) Шаблон финального risk-отчета

Для каждого риска использовать единый блок:

- `RiskId`: уникальный идентификатор (`R-01`, `R-02`, ...).
- `Severity`: `critical|high|medium`.
- `Location`: файл(ы) и логический блок.
- `Reproduction`: краткие шаги воспроизведения.
- `ObservedBehavior`: фактическое поведение.
- `ExpectedBehavior`: ожидаемое поведение.
- `CoveredBy`: ID тест-шаблона и ID сценария из матрицы.
- `Acceptance`: критерий pass/fail.
- `Status`: `open|mitigated|accepted`.

## 8) Критерии готовности аудита

- Прозрачная метрика активации времени определена и воспроизводима.
- Матрица из 10 сценариев покрывает сложные времена, контекст и настройки.
- Latency-метрика для диалога описана (p50/p95/p99 + бюджеты).
- Все выводы и риски остаются строго в контуре `dialogue/free_talk`.
