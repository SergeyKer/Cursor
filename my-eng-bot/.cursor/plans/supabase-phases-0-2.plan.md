# Supabase phases 0–2 + 3-prep (Engvo)

## Scope

Browser `@supabase/supabase-js` only. No profiles, SSR, middleware, Realtime, service role.

## Sequence

1. Anchor (this file + `.cursor/rules/supabase-rollout.mdc`)
2. Phase 0: client + flags OFF
3. Phase 1: anonymous bootstrap
4. Phase 2: `lesson_progress` local-first sync
5. Phase 3-prep: `record.ts` via learningMemory port
6. User: SQL → RLS matrix → flags Preview → CAPTCHA → Production

## Flags (default OFF)

- `NEXT_PUBLIC_FEATURE_SUPABASE_V1=true`
- `NEXT_PUBLIC_FEATURE_SUPABASE_LESSON_PROGRESS_SYNC=true`

Do not enable SYNC before SQL + RLS matrix.

## After code

1. Run `supabase/migrations/*_lesson_progress.sql` in SQL Editor
2. RLS matrix (A/B users)
3. Enable V1 locally, then SYNC
4. Preview soak, then Production with CAPTCHA/anti-abuse
