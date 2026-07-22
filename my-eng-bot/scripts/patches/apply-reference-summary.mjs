import fs from 'node:fs'
const f = 'components/MenuSectionPanels.tsx'
let s = fs.readFileSync(f, 'utf8')
const from = `            {lessonsPanel === 'summary' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  <MenuNavRow label="Теория" onClick={() => setLessonsPanel('theory')} />`
const to = `            {lessonsPanel === 'summary' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  {featureFlags.referenceV1 ? (
                    <MenuNavRow
                      label={REFERENCE_COPY.menuRootLabel}
                      onClick={() => {
                        setCatalogBrowseIntent('reference')
                        setReferenceHubSearchQuery('')
                        setLessonsPanel('theory')
                      }}
                    />
                  ) : null}
                  <MenuNavRow
                    label="Теория"
                    onClick={() => {
                      setCatalogBrowseIntent('lesson')
                      setLessonsPanel('theory')
                    }}
                  />`
const fromCr = from.replace(/\n/g, '\r\n')
const toCr = to.replace(/\n/g, '\r\n')
if (s.includes(fromCr)) s = s.replace(fromCr, toCr)
else if (s.includes(from)) s = s.replace(from, to)
else throw new Error('summary missing')
fs.writeFileSync(f, s, 'utf8')
console.log('summary ok')
