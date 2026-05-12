import 'server-only'

import { getCefrLevelConfig } from '@/lib/cefr/cefrConfig.server'
import { CEFR_LEVELS_CONFIG_PROMPT_REF, createCefrSpecApi } from '@/lib/cefr/cefrSpecBindings'

export type { CefrLevelSpec } from '@/lib/cefr/cefrSpecBindings'
export { CEFR_LEVELS_CONFIG_PROMPT_REF } from '@/lib/cefr/cefrSpecBindings'

const { getCefrSpec, getCefrDenyWords, buildCefrPromptBlock } = createCefrSpecApi(getCefrLevelConfig)

export { getCefrSpec, getCefrDenyWords, buildCefrPromptBlock }
