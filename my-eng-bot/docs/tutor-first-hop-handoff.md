# Tutor first-hop handoff (слой 1) — монолит с слоем 2

Слой 2 («Tutor loop engagement») внедрён. Слой 1 (first-hop + hop2 router) внедрён — см. **as-built first-hop** ниже.

## Kickoff (архив — для контекста)

Исходный kickoff жил в этом файле до внедрения. Актуальный контракт — секция as-built.

## Что уже сделано в слое 2 (краткий as-built)

| Область | Факт |
|---|---|
| topicContext | `buildTutorTopicContext` → API body |
| scope | normalizeTutorExplainResult + prompt allowlist |
| Чипы post-explain | micro + cheatsheet |
| Micro finale | microFinaleStrong/Mid/Weak + bandFromMicroScore |
| Return context | key `engvo.tutorReturnContext:v2`, поле `lastExplain` |
| followUpMode | удалён |

## as-built first-hop (+ hop 2 router)

### Поведение

| Ход | Поведение |
|---|---|
| Idle / нет lastExplain | `matchTutorGate` → `localTutorTriage` (A/B/C/D) |
| A | сразу `tutor-explain` без topicContext |
| B/C | живые чипы; свободный короткий angle-текст → `anchor: ответ` Explain |
| D / gate stop | copy без API |
| Есть lastExplain + continue | Explain + topicContext (углубление) |
| Есть lastExplain + switch | снова triage; A без old topicContext |
| out_of_scope / fail при живом lastExplain | post-explain chips **не гасятся** |

Continue (узко): `а в отрицании?`, `а пример`, `почему?`, `проверь:…`, упоминание текущей темы.  
Switch: новая грамтема (`а зачем Do?`), `научи…`, `глаголы`, явный новый вопрос.

### Ключевые файлы

- `lib/uiCopy/tutorChat.ts` — живой copy; `triagePickGoal/Angle` функции; `TUTOR_TRIAGE_CHIP_LABELS`
- `lib/tutor/tutorIntent.ts` — pure intent/topic/noise helpers
- `lib/tutor/tutorGate.ts` — smalltalk exact + составные off-topic/large-order
- `lib/tutor/localTriage.ts` — gate → intent/meta/B/C/A; short EN ≠ noise
- `lib/tutor/tutorTurnRouter.ts` — stop / continue / switch / first
- `components/tutor/TutorChatPanel.tsx` — единый `handleUserTurn`
- `app/api/tutor-explain/route.ts` — рецепт ответа + ветки no-ctx / with-ctx

### Non-negotiables (сохранены)

Micro pack/score/finale; return-context v2; cheatsheet soft-miss; AppShell; MyPlan writeback; пейвол; `practice_questions`; photo multi/blur; menu promote→space; prefill/autoSubmit.

### Приёмка (smoke)

1. `Как сказать «я уже сделал»?` → Explain  
2. `глаголы` → C чипы; свободный `когда ставить` → Explain с якорем  
3. После PP: `а в отрицании?` / `а почему в отрицании?` continue; `а зачем Do?` switch  
4. `спасибо` / `кто президент США` → stop без API; chips живы если тема была  
5. `как сказать президент?` → не gate  
6. `do` / `go` → C, не D  
7. `Почему I have a car и I have got a car` (без `?`) → Explain, не B-чипы; голый `have got` → B  
8. После B: свободный `Скажи разницу` → Explain с якорем (не второй B); pending follow-up не возвращает только чипы  
