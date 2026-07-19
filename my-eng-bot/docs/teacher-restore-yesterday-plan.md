# Восстановление веток звонка (Преподаватель + Free call)

Дата: 2026-07-19  
Статус: **исполнено локально** (ожидает коммита по просьбе).

## Что сделано

Точечный откат voice к концу вчера **`cb633dc`**, без отката Reference/footer.

1. Backup: ветка `backup/voice-broken-c7fbf80` (= бывший tip `c7fbf80`).
2. `git checkout cb633dc --` список voice-файлов (AppShell, Chat, engvo runtime/teacher/instructions, levelGuard).
3. `git rm` сегодняшних модулей: `xaiListenPolicy*`, `teacherRepeatAntiLoop*`, `teacherHandoffReclaim*`, `freeCallTurnCompleteness*`.
4. Поправка теста `teacherRhythmLock.test.ts`: принять вчерашнюю формулировку `pending Скажи/repeat`.
5. Проверки: **278** engvo/cefr/Chat tests OK; `check:cyrillic` OK.

## Откатанные сегодняшние коммиты (только voice-эффект)

- `39989bf` — listen arm / `language_hint: en` / anti-loop  
- `f81a545` — so:/not вместо Скажи  
- `c7fbf80` — free_call length reclaim + handoff budget  

## Не трогали

- Reference, footer sheet, UI вне списка  
- Conversational teacher / rhythm lock с 18.07 (они в `cb633dc` и раньше)

## Смоук (вручную)

1. Преподаватель: «море» → русская фраза + «Переведи»; ERROR через Скажи/You meant.  
2. Free call: ответ на русском входе — English only.

## Откат исполнения

```bash
git checkout backup/voice-broken-c7fbf80 -- <те же пути>
# и восстановить удалённые файлы из backup-ветки
```

Подробный план исполнения: Cursor plan `restore_call_branches`.
