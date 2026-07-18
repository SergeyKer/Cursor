import fs from 'node:fs'

const file = 'components/app/AppShell.tsx'
let s = fs.readFileSync(file, 'utf8')
const nl = s.includes('\r\n') ? '\r\n' : '\n'

const marker = "const lessonMenuLaunchSurfaceRef = React.useRef<'slide' | 'home'>('home')"
if (!s.includes(marker)) throw new Error('marker1 missing')
if (!s.includes('openedFromMyPlanRef')) {
  s = s.replace(
    marker,
    [
      marker,
      '  /** Session from My Plan: return to myPlan after exit. */',
      '  const openedFromMyPlanRef = React.useRef(false)',
      '  const markOpenedFromMyPlan = React.useCallback(() => {',
      '    openedFromMyPlanRef.current = true',
      '  }, [])',
    ].join(nl)
  )
}

const backStart = [
  '  const backToLessonList = useCallback(() => {',
  '    const launchSurface = lessonMenuLaunchSurfaceRef.current',
  '',
].join(nl)

if (!s.includes(backStart)) throw new Error('backStart missing')

if (!s.includes('const fromMyPlan = openedFromMyPlanRef.current')) {
  s = s.replace(
    backStart,
    [
      '  const backToLessonList = useCallback(() => {',
      '    const launchSurface = lessonMenuLaunchSurfaceRef.current',
      '    const fromMyPlan = openedFromMyPlanRef.current',
      '    if (fromMyPlan) openedFromMyPlanRef.current = false',
      '',
    ].join(nl)
  )

  const oldKeep = 'resetStructuredLessonSession({ keepLessonMenuContext: true })'
  const keepCount = s.split(oldKeep).length - 1
  if (keepCount < 1) throw new Error('keepLesson missing')
  // Only replace first occurrence inside backToLessonList (should be first after our edit)
  s = s.replace(oldKeep, 'resetStructuredLessonSession({ keepLessonMenuContext: !fromMyPlan })')

  const needle = [
    '    bumpFooterSessionContext()',
    "    if (launchSurface === 'slide') {",
    '      restoreLessonMenuOnNextOpenRef.current = true',
  ].join(nl)

  const idx = s.indexOf(needle)
  if (idx < 0) throw new Error('needle missing')
  const before = s.lastIndexOf('const fromMyPlan = openedFromMyPlanRef.current', idx)
  if (before < 0 || idx - before > 2500) throw new Error('wrong needle site')

  const insert = [
    '    bumpFooterSessionContext()',
    '    if (fromMyPlan) {',
    "      setHomeMenuView('myPlan')",
    "      if (launchSurface === 'slide') {",
    '        setMenuOpen(true)',
    '        return',
    '      }',
    '      setMenuOpen(false)',
    '      return',
    '    }',
    "    if (launchSurface === 'slide') {",
    '      restoreLessonMenuOnNextOpenRef.current = true',
  ].join(nl)

  s = s.slice(0, idx) + insert + s.slice(idx + needle.length)
}

const homeMark = [
  'onOpenAdaptivePracticeTopic={openAdaptivePracticeTopic}',
  '                    onOpenTutorLesson={openTutorLesson}',
].join(nl)
const slideMark = [
  'onOpenAdaptivePracticeTopic={openAdaptivePracticeTopic}',
  '        onOpenTutorLesson={openTutorLesson}',
].join(nl)

if ((s.match(/onMarkOpenedFromMyPlan=\{markOpenedFromMyPlan\}/g) || []).length < 2) {
  if (!s.includes(homeMark)) throw new Error('homeMark missing')
  if (!s.includes(slideMark)) throw new Error('slideMark missing')
  s = s.replace(
    homeMark,
    [
      'onOpenAdaptivePracticeTopic={openAdaptivePracticeTopic}',
      '                    onMarkOpenedFromMyPlan={markOpenedFromMyPlan}',
      '                    onOpenTutorLesson={openTutorLesson}',
    ].join(nl)
  )
  s = s.replace(
    slideMark,
    [
      'onOpenAdaptivePracticeTopic={openAdaptivePracticeTopic}',
      '        onMarkOpenedFromMyPlan={markOpenedFromMyPlan}',
      '        onOpenTutorLesson={openTutorLesson}',
    ].join(nl)
  )
}

fs.writeFileSync(file, s, 'utf8')
console.log('patched ok')
console.log('has ref', s.includes('openedFromMyPlanRef'))
console.log('mark props', (s.match(/onMarkOpenedFromMyPlan=\{markOpenedFromMyPlan\}/g) || []).length)
