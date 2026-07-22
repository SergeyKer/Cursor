import fs from 'node:fs'

const f = 'components/MenuSectionPanels.tsx'
let s = fs.readFileSync(f, 'utf8')

function mustReplace(from, to, label) {
  if (!s.includes(from)) throw new Error(`Patch failed: ${label}`)
  s = s.replace(from, to)
}

mustReplace(
  `  React.useEffect(() => {
    if (menuView !== 'lessons') setLessonsPanel('summary')
  }, [menuView])`,
  `  React.useEffect(() => {
    if (menuView !== 'lessons') {
      setLessonsPanel('summary')
      setCatalogBrowseIntent('lesson')
      setReferenceHubSearchQuery('')
    }
  }, [menuView])`,
  'reset intent on leave lessons'
)

fs.writeFileSync(f, s, 'utf8')
console.log('reset ok')
