import fs from 'node:fs'

const f = 'components/MyPlanPanel.tsx'
let s = fs.readFileSync(f, 'utf8')
const crlf = s.includes('\r\n')

function mustReplace(from, to, label) {
  const fromN = crlf ? from.replace(/\n/g, '\r\n') : from
  const toN = crlf ? to.replace(/\n/g, '\r\n') : to
  if (s.includes(fromN)) s = s.replace(fromN, toN)
  else if (s.includes(from)) s = s.replace(from, to)
  else throw new Error(label)
}

mustReplace(
  `import { MENU_PRIMARY_CTA_CLASS } from '@/lib/homeCtaStyles'`,
  `import { APP_BTN_SECONDARY_MENU, MENU_PRIMARY_CTA_CLASS } from '@/lib/homeCtaStyles'
import { featureFlags } from '@/lib/featureFlags'
import { isReferenceLessonId } from '@/lib/reference/getReferenceLessonTopics'
import { REFERENCE_COPY } from '@/lib/uiCopy/reference'`,
  'imports'
)

mustReplace(
  `  onOpenLearningLesson?: (lessonId: string) => void`,
  `  onOpenLearningLesson?: (lessonId: string) => void
  onOpenReferenceTopic?: (lessonId: string) => void`,
  'prop'
)

mustReplace(
  `  onOpenLearningLesson,`,
  `  onOpenLearningLesson,
  onOpenReferenceTopic,`,
  'destructure'
)

mustReplace(
  `        lessonId:
          action.kind === 'resume_lesson' ||
          action.kind === 'open_lesson' ||
          action.kind === 'start_practice' ||
          action.kind === 'reinforce_skill'
            ? action.lessonId
            : undefined,`,
  `        lessonId:
          action.kind === 'resume_lesson' ||
          action.kind === 'open_lesson' ||
          action.kind === 'start_practice' ||
          action.kind === 'reinforce_skill' ||
          action.kind === 'open_reference'
            ? action.lessonId
            : undefined,`,
  'analytics'
)

mustReplace(
  `        case 'resume_lesson':
        case 'open_lesson':
          onMarkOpenedFromMyPlan?.()
          onOpenLearningLesson?.(action.lessonId)
          return`,
  `        case 'resume_lesson':
        case 'open_lesson':
          onMarkOpenedFromMyPlan?.()
          onOpenLearningLesson?.(action.lessonId)
          return
        case 'open_reference':
          onMarkOpenedFromMyPlan?.()
          onOpenReferenceTopic?.(action.lessonId)
          return`,
  'handle open_reference'
)

mustReplace(
      `      onOpenLearningLesson,`,
      `      onOpenLearningLesson,
      onOpenReferenceTopic,`,
      'deps'
)

mustReplace(
  `        <div className="pt-3">
          <button
            type="button"
            disabled={practiceBusy}
            className={\`\${MENU_PRIMARY_CTA_CLASS} w-full min-h-[48px]\`}
            aria-label={resolvedMain.ariaLabel}
            onClick={() => void handleAction(resolvedMain.action, 'main')}
          >
            {practiceBusy ? copy.busy : resolvedMain.buttonLabel}
          </button>
        </div>
      </div>`,
  `        <div className="flex flex-col gap-2 pt-3">
          <button
            type="button"
            disabled={practiceBusy}
            className={\`\${MENU_PRIMARY_CTA_CLASS} w-full min-h-[48px]\`}
            aria-label={resolvedMain.ariaLabel}
            onClick={() => void handleAction(resolvedMain.action, 'main')}
          >
            {practiceBusy ? copy.busy : resolvedMain.buttonLabel}
          </button>
          {featureFlags.referenceV1 &&
          onOpenReferenceTopic &&
          (() => {
            const a = resolvedMain.action
            const lessonId =
              a.kind === 'resume_lesson' || a.kind === 'open_lesson' || a.kind === 'start_practice'
                ? a.lessonId
                : a.kind === 'reinforce_skill'
                  ? a.lessonId
                  : a.kind === 'open_reference'
                    ? a.lessonId
                    : null
            if (!lessonId || !isReferenceLessonId(lessonId)) return null
            return (
              <button
                type="button"
                disabled={practiceBusy}
                className={\`\${APP_BTN_SECONDARY_MENU} w-full min-h-[44px]\`}
                aria-label={REFERENCE_COPY.myPlanSecondary}
                onClick={() =>
                  void handleAction({ kind: 'open_reference', lessonId }, 'secondary')
                }
              >
                {REFERENCE_COPY.myPlanSecondary}
              </button>
            )
          })()}
        </div>
      </div>`,
  'secondary cta'
)

fs.writeFileSync(f, s, 'utf8')
console.log('MyPlanPanel ok')
