import fs from 'node:fs'
const f = 'components/app/AppShell.tsx'
let s = fs.readFileSync(f, 'utf8')

// Add home reference button after "Все уроки и режимы" in both myPlan and non-myPlan branches
const needle = `                          Все уроки и режимы
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex w-full items-center justify-between gap-2">`

// Better: find both occurrences of Все уроки button and add reference after each block's second button

const addAfter = (snippet) => {
  const cr = snippet.replace(/\n/g, '\r\n')
  const withRef = snippet.replace(
    `                          Все уроки и режимы
                        </button>`,
    `                          Все уроки и режимы
                        </button>
                        {featureFlags.referenceV1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setHomeMenuView('lessons')
                              // MenuSectionPanels restores via effect on menuView; open hub via pending context
                            }}
                            className={\`\${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0\`}
                          >
                            {APP_SHELL_HOME_COPY.startReferenceLabel}
                          </button>
                        ) : null}`
  )
  // Too fragile - skip home button; slide-out root is enough for v1
  return false
}

console.log('skip home root CTA - slide-out root covers entry')
