import fs from 'node:fs'

const f = 'components/MenuSectionPanels.tsx'
let s = fs.readFileSync(f, 'utf8')

const block = `  const [catalogBrowseIntent, setCatalogBrowseIntent] = React.useState<CatalogBrowseIntent>('lesson')
  const [referenceHubSearchQuery, setReferenceHubSearchQuery] = React.useState('')
  const isReferenceBrowse = featureFlags.referenceV1 && catalogBrowseIntent === 'reference'

`

if (!s.includes(block)) throw new Error('block missing')
s = s.replace(block, '')

const anchor = '  const a2PracticeTopicCopy = PRACTICE_TOPICS_BY_AUDIENCE[settings.audience]\n'
if (!s.includes(anchor)) throw new Error('anchor missing')
s = s.replace(anchor, anchor + block)

fs.writeFileSync(f, s, 'utf8')
console.log('moved ok')
