# Fast Start Load — итоговый отчёт

## Метрики kB

| Метрика | До | После | Цель | Статус |
|---------|-----|-------|------|--------|
| First Load `/` | 358 kB | **106 kB** | ≤140 kB | ✅ |
| Page chunk `/` | ~270 kB | ~17.7 kB | тонкий entry | ✅ |
| Shared | ~87.5 kB | ~88 kB | — | ✅ |
| AppShell chunk | in entry | отдельный async | отдельный | ✅ |
| Branch chunks (hub/chat/lesson/…) | in entry | dynamic по ветке | on demand | ✅ |
| Lesson 1 (pilot JSON) | in bundle | `/data/lessons/1.json` + loader | on demand | ✅ pilot |

## Gate-прогон

| Фаза | build | test | bundle | lint | Примечание |
|------|-------|------|--------|------|------------|
| 0 | ✅ | ✅ | baseline 358 kB | — | `check:bundle:baseline` |
| 1 | ✅ | ✅ | 106 kB | ✅ | StartShell + thin `page.tsx` |
| 2 | ✅ | ✅ | 106 kB | ✅ | AppShell + 7 branch chunks |
| 3 | ✅ | ✅ | 106 kB | ✅ | `loadLessonById` + JSON pilot |
| 4 | ✅ | ✅ | 106 kB | ✅ | eslint + restrictedImports test |
| 5 | ✅ | ✅ | 106 kB | ✅ | этот отчёт |

## Новые файлы

- `scripts/check-bundle-budget.mjs` — baseline/enforce
- `components/start/StartShell.tsx`, `StartPageChrome.tsx`
- `lib/start/startBridge.ts`, `branchRegistry.ts`, `activeBranch.ts`
- `components/app/AppShell.tsx`, `AppShellContext.tsx`
- `components/branches/*Branch.tsx` (7 веток)
- `lib/lessons/loadLessonById.ts`, `public/data/lessons/1.json`

## Регрессии

- npm test: **2269 passed** / 0 failed
- Контракт уроков: OK (включая `loadLessonById`)
- Smoke веток 1–15: **требует ручной platform matrix** (ПК / Android / iOS Safari)

## Platform matrix (ручная)

| Платформа | Статус |
|-----------|--------|
| ПК Chrome | pending manual |
| Android Chrome | pending manual |
| iOS Safari | pending manual |

## Риски / follow-up

- AppShell (~7k строк) — следующий шаг: физический перенос JSX в BranchRuntimes
- Урок 1: sync fallback в `structuredLessons.ts` для API; JSON — pilot в runtime

## Кодировка и кириллица

- **Не ломать UTF-8** в `AppShell.tsx` и других файлах с русским UI-текстом.
- Перед коммитом: `npm run check:cyrillic` (также входит в `npm test`).
- Vercel build: `npm test && npm run build` (см. `vercel.json`).
- Правки `AppShell.tsx`: `node scripts/safe-utf8-patch.mjs --file components/app/AppShell.tsx ...` или ручная правка в IDE.
- Новый пользовательский русский текст — в `lib/uiCopy/*`, не inline в AppShell.
