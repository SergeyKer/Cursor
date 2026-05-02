import type { AccentLesson, AccentMinimalPair, AccentSubstitutionPattern } from '@/types/accent'

function pair(target: string, contrast: string): AccentMinimalPair {
  return { target, contrast }
}

function substitution(id: string, label: string, examples: Record<string, string[]>, hint: string): AccentSubstitutionPattern {
  return { id, label, examples, hint }
}

function makeLesson(params: {
  id: string
  sectionId: string
  title: string
  shortTitle: string
  targetSound: string
  marker: string
  childMarker?: string
  teacherNote: string
  words: string[]
  pairs: Array<[string, string]>
  lines: string[]
  substitutions?: AccentSubstitutionPattern[]
}): AccentLesson {
  return {
    id: params.id,
    sectionId: params.sectionId,
    title: params.title,
    shortTitle: params.shortTitle,
    targetSound: params.targetSound,
    marker: params.marker,
    childMarker: params.childMarker ?? params.marker,
    teacherNote: params.teacherNote,
    words: params.words,
    minimalPairs: params.pairs.map(([target, contrast]) => pair(target, contrast)),
    progressiveLines: params.lines,
    knownSubstitutions: params.substitutions ?? [],
  }
}

const TH_THINK_SUBS = [
  substitution('th_to_t', 'TH -> T', { thank: ['tank'], think: ['tink'], three: ['tree'], thought: ['taught'] }, 'TH ушёл в T. Не превращай начало слова в резкий T.'),
  substitution('th_to_s', 'TH -> S', { think: ['sink'], thin: ['sin'], bath: ['bass'], mouth: ['mouse'] }, 'TH ушёл в S. Сохрани мягкий выдох, чтобы слово не стало похожим на S.'),
  substitution('th_to_f', 'TH -> F', { think: ['fink'], three: ['free'], bath: ['baf'], mouth: ['mouf'] }, 'TH ушёл в F. Не заменяй звук губами.'),
]

const TH_THIS_SUBS = [
  substitution('dh_to_d', 'TH -> D', { this: ['dis'], that: ['dat'], mother: ['mudder'], brother: ['brudder'] }, 'Звонкий TH ушёл в D. Сохрани мягкий звук без резкого удара.'),
  substitution('dh_to_z', 'TH -> Z', { this: ['zis'], those: ['zose'], mother: ['mazer'], brother: ['brazer'] }, 'Звонкий TH ушёл в Z. Не превращай его в жужжащий Z.'),
]

const R_SUBS = [
  substitution('r_to_l', 'R -> L', { right: ['light'], road: ['load'], river: ['liver'], red: ['led'] }, 'R смешался с L. Держим контраст right/light.'),
]

const W_SUBS = [
  substitution('w_to_v', 'W -> V', { west: ['vest'], wine: ['vine'], wet: ['vet'], whale: ['veil'] }, 'W ушёл в V. Это один из самых заметных русскоговорящих маркеров.'),
]

const H_SUBS = [
  substitution('h_to_x', 'H -> X/skip', { happy: ['khappy', 'appy'], how: ['cow'], heat: ['eat'] }, 'H стал слишком жёстким или пропал. Нужен лёгкий выдох.'),
]

const FINAL_VOICING_SUBS = [
  substitution('final_devoicing', 'final voiced -> voiceless', { bad: ['bat'], rug: ['ruck'], love: ['luff'], choose: ['juice'] }, 'Финальный звонкий согласный оглушился. Это влияет на смысл слова.'),
]

export const ACCENT_LESSONS: AccentLesson[] = [
  makeLesson({
    id: 'th-think',
    sectionId: 'dental-th',
    title: 'TH think',
    shortTitle: 'think',
    targetSound: '/θ/',
    marker: 'think не должен звучать как sink или tink.',
    childMarker: 'Поймаем TH, чтобы think не убегал в sink.',
    teacherNote: 'Маркер русского акцента: глухой TH часто заменяется на S/T/F.',
    words: ['think', 'thin', 'thick', 'thank', 'thumb', 'thorn', 'three', 'throat', 'throw', 'thread', 'truth', 'bath', 'path', 'math', 'both', 'north', 'south', 'mouth', 'teeth', 'breath'],
    pairs: [['think', 'sink'], ['thin', 'tin'], ['thank', 'tank'], ['three', 'tree'], ['thick', 'tick'], ['thorn', 'torn'], ['bath', 'bass'], ['mouth', 'mouse'], ['both', 'boat'], ['teeth', 'tease']],
    lines: ['three', 'three thin', 'three thin thinkers', 'three thin thinkers thought', 'three thin thinkers thought through things'],
    substitutions: TH_THINK_SUBS,
  }),
  makeLesson({
    id: 'th-bath',
    sectionId: 'dental-th',
    title: 'TH bath',
    shortTitle: 'bath',
    targetSound: '/θ/ final',
    marker: 'bath не должен звучать как bas или bat.',
    teacherNote: 'Фокус: глухой TH в конце слова без замены на S/T/F.',
    words: ['bath', 'path', 'math', 'both', 'mouth', 'teeth', 'breath', 'earth', 'fifth', 'ninth', 'truth', 'youth', 'health', 'wealth', 'south', 'north', 'worth', 'month', 'cloth', 'oath'],
    pairs: [['bath', 'bat'], ['path', 'pat'], ['math', 'mass'], ['both', 'boat'], ['mouth', 'mouse'], ['teeth', 'tease'], ['earth', 'art'], ['worth', 'worse'], ['month', 'monk'], ['oath', 'owed']],
    lines: ['bath', 'bath and path', 'bath and path both', 'bath and path both need', 'bath and path both need soft breath'],
    substitutions: TH_THINK_SUBS,
  }),
  makeLesson({
    id: 'th-this',
    sectionId: 'dental-th',
    title: 'TH this',
    shortTitle: 'this',
    targetSound: '/ð/',
    marker: 'this не должен звучать как zis или dis.',
    teacherNote: 'Маркер русского акцента: звонкий TH часто заменяется на Z/D/V.',
    words: ['this', 'that', 'these', 'those', 'then', 'there', 'they', 'them', 'their', 'though', 'thus', 'than', 'other', 'mother', 'father', 'brother', 'weather', 'together', 'clothing', 'breathe'],
    pairs: [['this', 'dis'], ['that', 'dat'], ['these', 'seize'], ['those', 'zose'], ['then', 'den'], ['there', 'dare'], ['they', 'day'], ['mother', 'mudder'], ['brother', 'brudder'], ['breathe', 'breed']],
    lines: ['this', 'this and that', 'this and that together', 'this and that together there', 'this and that together there with them'],
    substitutions: TH_THIS_SUBS,
  }),
  makeLesson({
    id: 'th-mother',
    sectionId: 'dental-th',
    title: 'TH mother',
    shortTitle: 'mother',
    targetSound: '/ð/ middle',
    marker: 'mother не должен звучать как modder или mazer.',
    teacherNote: 'Фокус: звонкий TH в середине и конце слова.',
    words: ['mother', 'father', 'brother', 'other', 'another', 'weather', 'together', 'rather', 'either', 'neither', 'clothing', 'bathing', 'breathing', 'smooth', 'bathe', 'breathe', 'worthy', 'gather', 'feather', 'leather'],
    pairs: [['mother', 'mudder'], ['father', 'farther'], ['brother', 'brudder'], ['other', 'udder'], ['weather', 'wether'], ['rather', 'radder'], ['breathe', 'breed'], ['bathe', 'bade'], ['smooth', 'smooze'], ['leather', 'letter']],
    lines: ['mother', 'mother and brother', 'mother and brother gather', 'mother and brother gather together', 'mother and brother gather together in the weather'],
    substitutions: TH_THIS_SUBS,
  }),
  makeLesson({
    id: 'r-river',
    sectionId: 'r-and-l',
    title: 'R river',
    shortTitle: 'river',
    targetSound: '/r/',
    marker: 'river не должен звучать как liver или с русским дрожащим Р.',
    teacherNote: 'Маркер русского акцента: English R не должен дрожать как русский Р.',
    words: ['red', 'right', 'river', 'road', 'round', 'read', 'rain', 'room', 'really', 'ready', 'rocket', 'around', 'arrow', 'carry', 'very', 'story', 'brown', 'green', 'bring', 'three'],
    pairs: [['right', 'light'], ['road', 'load'], ['river', 'liver'], ['red', 'led'], ['read', 'lead'], ['row', 'low'], ['rake', 'lake'], ['rock', 'lock'], ['grass', 'glass'], ['free', 'flee']],
    lines: ['river', 'river road', 'river road runs', 'river road runs around', 'river road runs around green trees'],
    substitutions: R_SUBS,
  }),
  makeLesson({
    id: 'r-clusters',
    sectionId: 'r-and-l',
    title: 'R clusters',
    shortTitle: 'clusters',
    targetSound: '/r/ clusters',
    marker: 'green, bring, three не должны разваливаться на лишние звуки.',
    teacherNote: 'Фокус: R в сочетаниях после согласных.',
    words: ['green', 'bring', 'three', 'free', 'fresh', 'train', 'tree', 'try', 'grow', 'great', 'cream', 'crisp', 'brown', 'bread', 'break', 'dream', 'draw', 'drink', 'spring', 'strong'],
    pairs: [['green', 'glean'], ['bring', 'bling'], ['free', 'flee'], ['train', 'plain'], ['tree', 'tea'], ['great', 'gate'], ['cream', 'clean'], ['brown', 'bound'], ['dream', 'deem'], ['strong', 'song']],
    lines: ['green', 'green trees', 'green trees grow', 'green trees grow strong', 'green trees grow strong around the river'],
    substitutions: R_SUBS,
  }),
  makeLesson({
    id: 'clear-l-love',
    sectionId: 'r-and-l',
    title: 'Clear L love',
    shortTitle: 'love',
    targetSound: '/l/',
    marker: 'love должен звучать легко, без тяжёлого русского L.',
    teacherNote: 'Фокус: clear L в начале слова.',
    words: ['love', 'light', 'lake', 'late', 'low', 'long', 'look', 'listen', 'lesson', 'letter', 'little', 'lucky', 'left', 'line', 'live', 'learn', 'language', 'laugh', 'leave', 'local'],
    pairs: [['love', 'rough'], ['light', 'right'], ['lake', 'rake'], ['low', 'row'], ['long', 'wrong'], ['look', 'rook'], ['left', 'raft'], ['line', 'rhyme'], ['live', 'rivet'], ['leave', 'reef']],
    lines: ['love', 'love light', 'love light lessons', 'love light lessons lately', 'love light lessons lately with local learners'],
  }),
  makeLesson({
    id: 'dark-l-feel',
    sectionId: 'r-and-l',
    title: 'Dark L feel',
    shortTitle: 'feel',
    targetSound: '/l/ final',
    marker: 'feel, full, call должны держать финальный L.',
    teacherNote: 'Фокус: финальный L без проглатывания и лишней гласной.',
    words: ['feel', 'full', 'fall', 'call', 'ball', 'pull', 'cool', 'school', 'small', 'well', 'tell', 'sell', 'mile', 'while', 'people', 'table', 'little', 'middle', 'travel', 'final'],
    pairs: [['feel', 'fee'], ['full', 'foo'], ['fall', 'foe'], ['call', 'core'], ['ball', 'bore'], ['pull', 'poor'], ['well', 'where'], ['tell', 'tear'], ['mile', 'mire'], ['while', 'wire']],
    lines: ['feel', 'feel well', 'feel well at school', 'feel well at school while', 'feel well at school while people travel'],
  }),
  makeLesson({
    id: 'r-l-contrast',
    sectionId: 'r-and-l',
    title: 'R/L contrast',
    shortTitle: 'R/L',
    targetSound: '/r/ vs /l/',
    marker: 'right и light должны звучать как разные слова.',
    teacherNote: 'Контраст меняет смысл: right/light, road/load.',
    words: ['right', 'light', 'road', 'load', 'river', 'liver', 'red', 'led', 'read', 'lead', 'row', 'low', 'rake', 'lake', 'rock', 'lock', 'grass', 'glass', 'free', 'flee'],
    pairs: [['right', 'light'], ['road', 'load'], ['river', 'liver'], ['red', 'led'], ['read', 'lead'], ['row', 'low'], ['rake', 'lake'], ['rock', 'lock'], ['grass', 'glass'], ['free', 'flee']],
    lines: ['right light', 'right light road load', 'right light road load river', 'right light road load river liver', 'right light road load river liver red led'],
    substitutions: R_SUBS,
  }),
  makeLesson({
    id: 'w-west',
    sectionId: 'w-v-h',
    title: 'W west',
    shortTitle: 'west',
    targetSound: '/w/',
    marker: 'west не должен звучать как vest.',
    teacherNote: 'Маркер русского акцента: W часто заменяется на V.',
    words: ['west', 'wet', 'wine', 'white', 'what', 'when', 'where', 'why', 'we', 'will', 'way', 'walk', 'work', 'world', 'warm', 'woman', 'water', 'week', 'wish', 'whale'],
    pairs: [['west', 'vest'], ['wet', 'vet'], ['wine', 'vine'], ['white', 'vite'], ['whale', 'veil'], ['wary', 'very'], ['wow', 'vow'], ['we', 'vee'], ['walk', 'vork'], ['wish', 'vish']],
    lines: ['west', 'west wind', 'west wind will', 'west wind will warm', 'west wind will warm the water'],
    substitutions: W_SUBS,
  }),
  makeLesson({
    id: 'v-very',
    sectionId: 'w-v-h',
    title: 'V very',
    shortTitle: 'very',
    targetSound: '/v/',
    marker: 'very должен отличаться от wary и west.',
    teacherNote: 'Фокус: V как отдельный контраст к W.',
    words: ['very', 'vest', 'vet', 'vine', 'voice', 'view', 'value', 'visit', 'village', 'video', 'vivid', 'drive', 'five', 'live', 'love', 'move', 'give', 'above', 'never', 'every'],
    pairs: [['very', 'wary'], ['vest', 'west'], ['vet', 'wet'], ['vine', 'wine'], ['veil', 'whale'], ['vow', 'wow'], ['live', 'liver'], ['love', 'luff'], ['move', 'mood'], ['give', 'gif']],
    lines: ['very', 'very vivid', 'very vivid voice', 'very vivid voice every', 'very vivid voice every visit'],
  }),
  makeLesson({
    id: 'w-v-contrast',
    sectionId: 'w-v-h',
    title: 'W/V contrast',
    shortTitle: 'W/V',
    targetSound: '/w/ vs /v/',
    marker: 'wine и vine должны быть разными словами.',
    teacherNote: 'Один из самых заметных русскоговорящих маркеров.',
    words: ['west', 'vest', 'wet', 'vet', 'wine', 'vine', 'white', 'veil', 'wary', 'very', 'wow', 'vow', 'we', 'vee', 'walk', 'visit', 'work', 'voice', 'wish', 'vivid'],
    pairs: [['west', 'vest'], ['wet', 'vet'], ['wine', 'vine'], ['white', 'vite'], ['whale', 'veil'], ['wary', 'very'], ['wow', 'vow'], ['we', 'vee'], ['walk', 'vork'], ['wish', 'vish']],
    lines: ['wine vine', 'wine vine west vest', 'wine vine west vest wet', 'wine vine west vest wet vet', 'wine vine west vest wet vet with very clear words'],
    substitutions: W_SUBS,
  }),
  makeLesson({
    id: 'h-happy',
    sectionId: 'w-v-h',
    title: 'H happy',
    shortTitle: 'happy',
    targetSound: '/h/',
    marker: 'happy не должен звучать как khappy или appy.',
    teacherNote: 'H часто пропадает или становится русским Х.',
    words: ['happy', 'how', 'home', 'hot', 'help', 'hello', 'hand', 'head', 'heart', 'hard', 'house', 'hope', 'half', 'hill', 'history', 'hotel', 'hungry', 'hundred', 'behind', 'perhaps'],
    pairs: [['happy', 'appy'], ['how', 'cow'], ['heat', 'eat'], ['hand', 'and'], ['heart', 'art'], ['hill', 'ill'], ['hair', 'air'], ['hate', 'ate'], ['hold', 'old'], ['harm', 'arm']],
    lines: ['happy', 'happy home', 'happy home has', 'happy home has hot', 'happy home has hot help'],
    substitutions: H_SUBS,
  }),
  makeLesson({
    id: 'h-connected',
    sectionId: 'w-v-h',
    title: 'H connected',
    shortTitle: 'H phrases',
    targetSound: '/h/ phrases',
    marker: 'H в коротких фразах не должен исчезать слишком рано.',
    teacherNote: 'Фокус: H в живой короткой речи.',
    words: ['he', 'his', 'her', 'him', 'has', 'have', 'had', 'here', 'home', 'help', 'he has', 'his home', 'her hand', 'help him', 'have hope', 'had help', 'here he is', 'where he', 'what he', 'can he'],
    pairs: [['he', 'e'], ['his', 'is'], ['her', 'er'], ['him', 'im'], ['has', 'as'], ['have', 'av'], ['had', 'ad'], ['here', 'ear'], ['home', 'ome'], ['help', 'elp']],
    lines: ['he has', 'he has his', 'he has his home', 'he has his home here', 'he has his home here and helps her'],
    substitutions: H_SUBS,
  }),
]

const MORE_LESSONS: AccentLesson[] = [
  makeLesson({ id: 'ee-feet', sectionId: 'long-short-vowels', title: 'EE feet', shortTitle: 'feet', targetSound: '/iː/', marker: 'feet должен отличаться от fit.', teacherNote: 'Контраст долгого и краткого I меняет слово.', words: ['feet', 'see', 'green', 'read', 'scene', 'sheep', 'seat', 'beat', 'leave', 'feel', 'team', 'deep', 'sleep', 'need', 'keep', 'week', 'meet', 'heat', 'each', 'easy'], pairs: [['feet', 'fit'], ['sheep', 'ship'], ['seat', 'sit'], ['beat', 'bit'], ['leave', 'live'], ['feel', 'fill'], ['green', 'grin'], ['reach', 'rich'], ['heel', 'hill'], ['sleep', 'slip']], lines: ['feet', 'green feet', 'green feet need', 'green feet need clean', 'green feet need clean streets'] }),
  makeLesson({ id: 'i-fit', sectionId: 'long-short-vowels', title: 'I fit', shortTitle: 'fit', targetSound: '/ɪ/', marker: 'fit не должен звучать как feet.', teacherNote: 'Краткий I часто растягивается как долгий.', words: ['fit', 'sit', 'ship', 'bit', 'live', 'fill', 'grin', 'rich', 'hill', 'slip', 'this', 'with', 'little', 'city', 'minute', 'listen', 'middle', 'visit', 'ticket', 'finish'], pairs: [['fit', 'feet'], ['sit', 'seat'], ['ship', 'sheep'], ['bit', 'beat'], ['live', 'leave'], ['fill', 'feel'], ['grin', 'green'], ['rich', 'reach'], ['hill', 'heel'], ['slip', 'sleep']], lines: ['fit', 'fit this', 'fit this little', 'fit this little ticket', 'fit this little ticket in the middle'] }),
  makeLesson({ id: 'feet-fit', sectionId: 'long-short-vowels', title: 'Feet/Fit', shortTitle: 'feet/fit', targetSound: '/iː/ vs /ɪ/', marker: 'feet и fit должны быть разными словами.', teacherNote: 'Контраст /iː/ vs /ɪ/ — частый источник путаницы.', words: ['feet', 'fit', 'seat', 'sit', 'sheep', 'ship', 'beat', 'bit', 'leave', 'live', 'feel', 'fill', 'green', 'grin', 'reach', 'rich', 'heel', 'hill', 'sleep', 'slip'], pairs: [['feet', 'fit'], ['seat', 'sit'], ['sheep', 'ship'], ['beat', 'bit'], ['leave', 'live'], ['feel', 'fill'], ['green', 'grin'], ['reach', 'rich'], ['heel', 'hill'], ['sleep', 'slip']], lines: ['feet fit', 'feet fit seat sit', 'feet fit seat sit sheep', 'feet fit seat sit sheep ship', 'feet fit seat sit sheep ship leave live'] }),
  makeLesson({ id: 'oo-loop', sectionId: 'long-short-vowels', title: 'OO loop', shortTitle: 'loop', targetSound: '/uː/', marker: 'loop должен отличаться от look.', teacherNote: 'Долгий /uː/ в английском отличается от русского У.', words: ['loop', 'food', 'moon', 'blue', 'school', 'cool', 'soon', 'room', 'move', 'choose', 'boot', 'pool', 'tool', 'rule', 'true', 'June', 'new', 'shoe', 'do', 'too'], pairs: [['loop', 'look'], ['pool', 'pull'], ['fool', 'full'], ['Luke', 'look'], ['boot', 'book'], ['suit', 'soot'], ['cooed', 'could'], ['shooed', 'should'], ['food', 'foot'], ['pool', 'Paul']], lines: ['loop', 'blue loop', 'blue loop soon', 'blue loop soon moves', 'blue loop soon moves through school'] }),
  makeLesson({ id: 'u-look', sectionId: 'long-short-vowels', title: 'U look', shortTitle: 'look', targetSound: '/ʊ/', marker: 'look не должен звучать как loop.', teacherNote: 'Краткий /ʊ/ часто заменяется на долгий /uː/.', words: ['look', 'book', 'cook', 'good', 'foot', 'put', 'pull', 'full', 'should', 'could', 'would', 'wood', 'hood', 'stood', 'took', 'shook', 'push', 'woman', 'sugar', 'bull'], pairs: [['look', 'loop'], ['pull', 'pool'], ['full', 'fool'], ['book', 'boot'], ['foot', 'food'], ['could', 'cooed'], ['should', 'shooed'], ['would', 'wooed'], ['hood', 'who’d'], ['took', 'too']], lines: ['look', 'look good', 'look good and', 'look good and put', 'look good and put the book down'] }),
  makeLesson({ id: 'look-loop', sectionId: 'long-short-vowels', title: 'Look/Loop', shortTitle: 'look/loop', targetSound: '/ʊ/ vs /uː/', marker: 'look и loop должны быть разными словами.', teacherNote: 'Контраст /ʊ/ vs /uː/ влияет на смысл.', words: ['look', 'loop', 'book', 'boot', 'pull', 'pool', 'full', 'fool', 'foot', 'food', 'could', 'cooed', 'should', 'shooed', 'would', 'wooed', 'hood', 'who’d', 'took', 'too'], pairs: [['look', 'loop'], ['book', 'boot'], ['pull', 'pool'], ['full', 'fool'], ['foot', 'food'], ['could', 'cooed'], ['should', 'shooed'], ['would', 'wooed'], ['hood', 'who’d'], ['took', 'too']], lines: ['look loop', 'look loop book boot', 'look loop book boot pull', 'look loop book boot pull pool', 'look loop book boot pull pool full fool'] }),
  makeLesson({ id: 'ae-man', sectionId: 'open-vowels', title: 'AE man', shortTitle: 'man', targetSound: '/æ/', marker: 'man не должен звучать как men.', teacherNote: 'Открытый /æ/ часто схлопывается в /e/.', words: ['man', 'bad', 'cat', 'hat', 'map', 'sand', 'land', 'black', 'back', 'apple', 'happy', 'travel', 'family', 'can', 'plan', 'stand', 'match', 'matter', 'camera', 'animal'], pairs: [['man', 'men'], ['bad', 'bed'], ['cat', 'ket'], ['hat', 'head'], ['map', 'met'], ['sand', 'send'], ['land', 'lend'], ['black', 'bleck'], ['back', 'beck'], ['pan', 'pen']], lines: ['man', 'man had', 'man had a map', 'man had a map and', 'man had a map and a black bag'] }),
  makeLesson({ id: 'e-men', sectionId: 'open-vowels', title: 'E men', shortTitle: 'men', targetSound: '/e/', marker: 'men должен отличаться от man.', teacherNote: 'Контраст /e/ vs /æ/ нужен для понимания слов.', words: ['men', 'bed', 'pet', 'send', 'lend', 'head', 'pen', 'ten', 'red', 'left', 'letter', 'better', 'friend', 'end', 'every', 'never', 'ready', 'weather', 'says', 'again'], pairs: [['men', 'man'], ['bed', 'bad'], ['pet', 'pat'], ['send', 'sand'], ['lend', 'land'], ['head', 'had'], ['pen', 'pan'], ['ten', 'tan'], ['red', 'rad'], ['left', 'laughed']], lines: ['men', 'men send', 'men send red', 'men send red letters', 'men send red letters every day'] }),
  makeLesson({ id: 'man-men', sectionId: 'open-vowels', title: 'Man/Men', shortTitle: 'man/men', targetSound: '/æ/ vs /e/', marker: 'man и men должны быть разными словами.', teacherNote: 'Контраст /æ/ и /e/ часто выдаёт русскоговорящего.', words: ['man', 'men', 'bad', 'bed', 'cat', 'pet', 'hat', 'head', 'sand', 'send', 'land', 'lend', 'pan', 'pen', 'tan', 'ten', 'back', 'beck', 'bag', 'beg'], pairs: [['man', 'men'], ['bad', 'bed'], ['cat', 'pet'], ['hat', 'head'], ['sand', 'send'], ['land', 'lend'], ['pan', 'pen'], ['tan', 'ten'], ['back', 'beck'], ['bag', 'beg']], lines: ['man men', 'man men bad bed', 'man men bad bed cat', 'man men bad bed cat pet', 'man men bad bed cat pet sand send'] }),
  makeLesson({ id: 'uh-hut', sectionId: 'open-vowels', title: 'UH hut', shortTitle: 'hut', targetSound: '/ʌ/', marker: 'hut не должен звучать как heart.', teacherNote: 'Краткий /ʌ/ часто смешивается с русским А.', words: ['hut', 'cut', 'cup', 'bus', 'sun', 'fun', 'run', 'luck', 'much', 'love', 'money', 'mother', 'brother', 'another', 'study', 'under', 'summer', 'touch', 'young', 'come'], pairs: [['hut', 'heart'], ['cut', 'cart'], ['cup', 'cap'], ['bus', 'bass'], ['sun', 'son'], ['luck', 'lock'], ['much', 'march'], ['love', 'lav'], ['run', 'ran'], ['come', 'calm']], lines: ['hut', 'hut in sun', 'hut in sun under', 'hut in sun under summer', 'hut in sun under summer light'] }),
  makeLesson({ id: 'ah-heart', sectionId: 'open-vowels', title: 'AH heart', shortTitle: 'heart', targetSound: '/ɑː/', marker: 'heart должен отличаться от hut.', teacherNote: 'Долгий открытый /ɑː/ не равен русскому краткому А.', words: ['heart', 'car', 'park', 'far', 'start', 'hard', 'large', 'dark', 'barn', 'cart', 'part', 'march', 'calm', 'father', 'rather', 'half', 'laugh', 'class', 'last', 'after'], pairs: [['heart', 'hut'], ['car', 'cut'], ['park', 'puck'], ['far', 'fun'], ['start', 'stut'], ['hard', 'hud'], ['cart', 'cut'], ['part', 'put'], ['calm', 'come'], ['father', 'further']], lines: ['heart', 'heart starts', 'heart starts far', 'heart starts far after', 'heart starts far after dark'] }),
  makeLesson({ id: 'hut-heart', sectionId: 'open-vowels', title: 'Hut/Heart', shortTitle: 'hut/heart', targetSound: '/ʌ/ vs /ɑː/', marker: 'hut и heart должны быть разными словами.', teacherNote: 'Контраст /ʌ/ и /ɑː/ часто влияет на понятность.', words: ['hut', 'heart', 'cut', 'cart', 'luck', 'lock', 'come', 'calm', 'run', 'ran', 'bus', 'bass', 'cup', 'cap', 'much', 'march', 'love', 'laugh', 'sun', 'son'], pairs: [['hut', 'heart'], ['cut', 'cart'], ['luck', 'lock'], ['come', 'calm'], ['run', 'ran'], ['bus', 'bass'], ['cup', 'cap'], ['much', 'march'], ['love', 'laugh'], ['sun', 'son']], lines: ['hut heart', 'hut heart cut cart', 'hut heart cut cart come', 'hut heart cut cart come calm', 'hut heart cut cart come calm run ran'] }),
]

const FINAL_LESSONS: AccentLesson[] = [
  makeLesson({ id: 'ay-play', sectionId: 'diphthongs', title: 'AY play', shortTitle: 'play', targetSound: '/eɪ/', marker: 'play не должен быть плоским русским Э.', teacherNote: 'Дифтонг /eɪ/ требует движения, не одной гласной.', words: ['play', 'day', 'take', 'make', 'name', 'same', 'late', 'great', 'main', 'rain', 'train', 'say', 'way', 'stay', 'change', 'paper', 'baby', 'table', 'place', 'safe'], pairs: [['play', 'pleh'], ['day', 'deh'], ['take', 'tech'], ['make', 'meck'], ['late', 'let'], ['main', 'men'], ['rain', 'ran'], ['say', 'set'], ['way', 'vet'], ['safe', 'self']], lines: ['play', 'play safe', 'play safe today', 'play safe today and', 'play safe today and stay late'] }),
  makeLesson({ id: 'oh-go', sectionId: 'diphthongs', title: 'OH go', shortTitle: 'go', targetSound: '/əʊ/', marker: 'go не должен быть плоским русским О.', teacherNote: 'Дифтонг /əʊ/ часто упрощается до одного О.', words: ['go', 'no', 'home', 'stone', 'phone', 'alone', 'open', 'over', 'only', 'slow', 'show', 'boat', 'road', 'coat', 'hope', 'cold', 'old', 'most', 'post', 'don’t'], pairs: [['go', 'gaw'], ['no', 'now'], ['home', 'hum'], ['stone', 'stun'], ['phone', 'fun'], ['alone', 'a loan'], ['slow', 'slaw'], ['boat', 'bot'], ['coat', 'cot'], ['hope', 'hop']], lines: ['go', 'go home', 'go home slowly', 'go home slowly over', 'go home slowly over the old road'] }),
  makeLesson({ id: 'eye-time', sectionId: 'diphthongs', title: 'EYE time', shortTitle: 'time', targetSound: '/aɪ/', marker: 'time должен держать движение гласного.', teacherNote: 'Фокус: движение /aɪ/ в коротких словах.', words: ['time', 'my', 'five', 'like', 'right', 'light', 'night', 'white', 'kind', 'mind', 'find', 'line', 'life', 'price', 'try', 'why', 'high', 'eye', 'buy', 'sky'], pairs: [['time', 'tam'], ['my', 'me'], ['five', 'fave'], ['like', 'lick'], ['right', 'red'], ['night', 'net'], ['white', 'wet'], ['kind', 'kend'], ['line', 'lean'], ['life', 'left']], lines: ['time', 'time flies', 'time flies by', 'time flies by my', 'time flies by my right side'] }),
  makeLesson({ id: 'ow-now', sectionId: 'diphthongs', title: 'OW now', shortTitle: 'now', targetSound: '/aʊ/', marker: 'now должен держать движение гласного.', teacherNote: 'Фокус: /aʊ/ без плоской русской гласной.', words: ['now', 'how', 'house', 'mouth', 'south', 'sound', 'round', 'around', 'brown', 'down', 'town', 'cloud', 'loud', 'out', 'about', 'count', 'found', 'shout', 'flower', 'power'], pairs: [['now', 'no'], ['how', 'ho'], ['house', 'hose'], ['mouth', 'moth'], ['south', 'sooth'], ['sound', 'sand'], ['round', 'rand'], ['down', 'done'], ['town', 'tone'], ['out', 'ought']], lines: ['now', 'now how', 'now how round', 'now how round brown', 'now how round brown sounds out'] }),
  makeLesson({ id: 'oy-boy', sectionId: 'diphthongs', title: 'OY boy', shortTitle: 'boy', targetSound: '/ɔɪ/', marker: 'boy должен звучать с движением OY.', teacherNote: 'Фокус: /ɔɪ/ в коротких словах.', words: ['boy', 'toy', 'joy', 'voice', 'choice', 'noise', 'coin', 'join', 'point', 'oil', 'boil', 'soil', 'avoid', 'enjoy', 'employ', 'royal', 'destroy', 'annoy', 'loyal', 'oyster'], pairs: [['boy', 'bo'], ['toy', 'toe'], ['joy', 'jaw'], ['voice', 'verse'], ['choice', 'chase'], ['noise', 'nose'], ['coin', 'cone'], ['join', 'June'], ['point', 'paint'], ['oil', 'all']], lines: ['boy', 'boy enjoys', 'boy enjoys noisy', 'boy enjoys noisy toys', 'boy enjoys noisy toys and coins'] }),
  makeLesson({ id: 'p-park', sectionId: 'air-plosives', title: 'P park', shortTitle: 'park', targetSound: 'aspirated /p/', marker: 'park должен иметь лёгкий выдох в начале.', teacherNote: 'Аспирация /p/ делает английский яснее.', words: ['park', 'pen', 'play', 'paper', 'people', 'part', 'put', 'pick', 'pool', 'pay', 'past', 'possible', 'power', 'pretty', 'please', 'plan', 'place', 'point', 'practice', 'perfect'], pairs: [['park', 'bark'], ['pen', 'ben'], ['pay', 'bay'], ['pool', 'bool'], ['pack', 'back'], ['pin', 'bin'], ['pat', 'bat'], ['pie', 'buy'], ['pear', 'bear'], ['pig', 'big']], lines: ['park', 'park people', 'park people play', 'park people play ping', 'park people play ping pong'] }),
  makeLesson({ id: 't-tim', sectionId: 'air-plosives', title: 'T Tim', shortTitle: 'Tim', targetSound: 'aspirated /t/', marker: 'Tim не должен звучать как dim.', teacherNote: 'Аспирация /t/ в начале stressed слова.', words: ['Tim', 'tea', 'top', 'ten', 'take', 'time', 'tell', 'town', 'table', 'teacher', 'today', 'team', 'tall', 'turn', 'ticket', 'touch', 'two', 'train', 'tree', 'true'], pairs: [['Tim', 'dim'], ['tea', 'dee'], ['top', 'dop'], ['ten', 'den'], ['take', 'day'], ['time', 'dime'], ['tell', 'dell'], ['town', 'down'], ['two', 'do'], ['train', 'drain']], lines: ['Tim', 'Tim takes', 'Tim takes two', 'Tim takes two tickets', 'Tim takes two tickets to town'] }),
  makeLesson({ id: 'k-car', sectionId: 'air-plosives', title: 'K car', shortTitle: 'car', targetSound: 'aspirated /k/', marker: 'car должен иметь лёгкий выдох в начале.', teacherNote: 'Аспирация /k/ часто отсутствует у русскоговорящих.', words: ['car', 'key', 'cold', 'cat', 'come', 'keep', 'kind', 'kite', 'call', 'coffee', 'king', 'class', 'clean', 'clear', 'quick', 'quiet', 'kitchen', 'camera', 'carry', 'corner'], pairs: [['car', 'gar'], ['key', 'gee'], ['cold', 'gold'], ['cat', 'gat'], ['come', 'gum'], ['keep', 'geep'], ['kind', 'guyed'], ['call', 'gall'], ['class', 'glass'], ['clean', 'glean']], lines: ['car', 'car keys', 'car keys come', 'car keys come quickly', 'car keys come quickly to class'] }),
  makeLesson({ id: 'ptk-phrases', sectionId: 'air-plosives', title: 'P/T/K phrases', shortTitle: 'P/T/K', targetSound: 'aspiration phrases', marker: 'P/T/K в коротких фразах должны звучать ясно.', teacherNote: 'Фокус: перенос аспирации в фразы.', words: ['park', 'Tim', 'car', 'put', 'this', 'tea', 'cup', 'please', 'take', 'Kate', 'play', 'two', 'cool', 'places', 'today', 'quick', 'people', 'talk', 'kind', 'coffee'], pairs: [['park', 'bark'], ['Tim', 'dim'], ['car', 'gar'], ['put', 'but'], ['tea', 'dee'], ['cup', 'cub'], ['take', 'day'], ['Kate', 'gate'], ['cool', 'ghoul'], ['talk', 'dog']], lines: ['put this tea', 'put this tea in', 'put this tea in the cup', 'put this tea in the cup please', 'put this tea in the cup please and take Kate'] }),
  makeLesson({ id: 'final-d-bad', sectionId: 'final-voicing', title: 'Final D bad', shortTitle: 'bad', targetSound: 'final /d/', marker: 'bad не должен звучать как bat.', teacherNote: 'Финальное оглушение меняет смысл слова.', words: ['bad', 'had', 'red', 'road', 'made', 'sad', 'bed', 'head', 'food', 'good', 'need', 'read', 'played', 'called', 'opened', 'closed', 'loved', 'moved', 'tried', 'studied'], pairs: [['bad', 'bat'], ['had', 'hat'], ['red', 'ret'], ['road', 'wrote'], ['made', 'mate'], ['sad', 'sat'], ['bed', 'bet'], ['head', 'het'], ['food', 'foot'], ['need', 'neat']], lines: ['bad', 'bad road', 'bad road had', 'bad road had red', 'bad road had red signs'] }),
  makeLesson({ id: 'final-g-rug', sectionId: 'final-voicing', title: 'Final G rug', shortTitle: 'rug', targetSound: 'final /g/', marker: 'rug не должен звучать как ruck.', teacherNote: 'Финальный G часто оглушается в K.', words: ['rug', 'bag', 'big', 'dog', 'leg', 'flag', 'egg', 'fog', 'log', 'plug', 'drag', 'frog', 'hug', 'mug', 'tag', 'dig', 'jog', 'bug', 'catalog', 'dialog'], pairs: [['rug', 'ruck'], ['bag', 'back'], ['big', 'bick'], ['dog', 'dock'], ['leg', 'leck'], ['flag', 'flack'], ['egg', 'heck'], ['fog', 'folk'], ['log', 'lock'], ['plug', 'pluck']], lines: ['rug', 'big rug', 'big rug and', 'big rug and dog', 'big rug and dog in fog'] }),
  makeLesson({ id: 'final-v-love', sectionId: 'final-voicing', title: 'Final V love', shortTitle: 'love', targetSound: 'final /v/', marker: 'love не должен звучать как luff.', teacherNote: 'Финальный V часто оглушается в F.', words: ['love', 'live', 'give', 'move', 'leave', 'five', 'drive', 'above', 'have', 'save', 'wave', 'brave', 'glove', 'serve', 'solve', 'twelve', 'active', 'native', 'positive', 'expensive'], pairs: [['love', 'luff'], ['live', 'life'], ['give', 'gif'], ['move', 'moof'], ['leave', 'leaf'], ['five', 'fife'], ['drive', 'drife'], ['save', 'safe'], ['wave', 'waif'], ['glove', 'gluff']], lines: ['love', 'love five', 'love five brave', 'love five brave waves', 'love five brave waves above'] }),
  makeLesson({ id: 'final-z-choose', sectionId: 'final-voicing', title: 'Final Z choose', shortTitle: 'choose', targetSound: 'final /z/', marker: 'choose не должен звучать как juice.', teacherNote: 'Финальный Z часто оглушается в S.', words: ['choose', 'use', 'please', 'these', 'those', 'days', 'ways', 'news', 'eyes', 'boys', 'girls', 'cars', 'plans', 'runs', 'plays', 'lives', 'moves', 'gives', 'sees', 'does'], pairs: [['choose', 'juice'], ['use', 'loose'], ['please', 'police'], ['these', 'this'], ['those', 'dose'], ['days', 'dace'], ['ways', 'waste'], ['eyes', 'ice'], ['boys', 'boice'], ['cars', 'case']], lines: ['choose', 'choose these', 'choose these days', 'choose these days wisely', 'choose these days wisely with clear words'] }),
  makeLesson({ id: 'voicing-mixed', sectionId: 'final-voicing', title: 'Mixed final voicing', shortTitle: 'voicing', targetSound: 'final voiced consonants', marker: 'bad, rug, love, choose должны держать финальный звук.', teacherNote: 'Смешанная тренировка финального оглушения.', words: ['bad', 'rug', 'love', 'choose', 'road', 'bag', 'give', 'use', 'made', 'dog', 'move', 'please', 'bed', 'flag', 'drive', 'these', 'food', 'leg', 'leave', 'days'], pairs: [['bad', 'bat'], ['rug', 'ruck'], ['love', 'luff'], ['choose', 'juice'], ['road', 'wrote'], ['bag', 'back'], ['give', 'gif'], ['use', 'loose'], ['made', 'mate'], ['dog', 'dock']], lines: ['bad rug', 'bad rug love', 'bad rug love choose', 'bad rug love choose road', 'bad rug love choose road bag give use'], substitutions: FINAL_VOICING_SUBS }),
  makeLesson({ id: 'schwa-about', sectionId: 'weak-syllables', title: 'Schwa about', shortTitle: 'about', targetSound: '/ə/', marker: 'about не должен звучать слишком напряжённо по буквам.', teacherNote: 'Schwa и слабые слоги часто делают речь менее русской.', words: ['about', 'again', 'around', 'away', 'alone', 'teacher', 'better', 'manner', 'sailor', 'cactus', 'lentil', 'family', 'camera', 'banana', 'support', 'today', 'tomorrow', 'perhaps', 'polite', 'collect'], pairs: [['about', 'a bout'], ['again', 'a gain'], ['around', 'a round'], ['away', 'a way'], ['teacher', 'tea chair'], ['better', 'bedder'], ['manner', 'manor'], ['sailor', 'seller'], ['family', 'fam lee'], ['camera', 'cam ra']], lines: ['about', 'about a teacher', 'about a teacher again', 'about a teacher again today', 'about a teacher again today and tomorrow'] }),
  makeLesson({ id: 'schwa-phrases', sectionId: 'weak-syllables', title: 'Schwa phrases', shortTitle: 'weak vowels', targetSound: 'weak vowels', marker: 'слабые слоги не должны звучать слишком отдельно.', teacherNote: 'Фокус: слабые гласные внутри фраз.', words: ['a cup of tea', 'a lot of time', 'come and see', 'for a minute', 'to the park', 'can I', 'could you', 'would you', 'as a result', 'in a moment', 'at a table', 'on a sofa', 'with a teacher', 'from a friend', 'have a look', 'take a seat', 'give it away', 'put it together', 'over and over', 'again and again'], pairs: [['a cup', 'cup'], ['of tea', 'off tea'], ['and see', 'end see'], ['to the', 'two the'], ['can I', 'can eye'], ['could you', 'could Jew'], ['would you', 'wood you'], ['as a', 'aza'], ['in a', 'inner'], ['have a', 'havva']], lines: ['a cup', 'a cup of tea', 'a cup of tea and', 'a cup of tea and a', 'a cup of tea and a little time'] }),
  makeLesson({ id: 'word-stress', sectionId: 'rhythm-connected', title: 'Word stress', shortTitle: 'word stress', targetSound: 'word stress', marker: 'ударение должно помогать распознать слово.', teacherNote: 'Словесное ударение — сильный маркер русскоговорящего акцента.', words: ['PREsent', 'preSENT', 'REcord', 'reCORD', 'PHOtograph', 'phoTOGraphy', 'ecoNOmic', 'ecoNOMics', 'aBOUT', 'toMORrow', 'underSTAND', 'imPORtant', 'COMfortable', 'inTEResting', 'faMIlier', 'aVAILable', 'deVELop', 'deVELopment', 'reLAX', 'reLAXing'], pairs: [['PREsent', 'preSENT'], ['REcord', 'reCORD'], ['CONtest', 'conTEST'], ['PROject', 'proJECT'], ['INcrease', 'inCREASE'], ['PERmit', 'perMIT'], ['EXport', 'exPORT'], ['IMport', 'imPORT'], ['OBject', 'obJECT'], ['CONduct', 'conDUCT']], lines: ['important', 'important words', 'important words need', 'important words need stress', 'important words need stress in English'] }),
  makeLesson({ id: 'sentence-stress', sectionId: 'rhythm-connected', title: 'Sentence stress', shortTitle: 'sentence stress', targetSound: 'sentence stress', marker: 'в английской фразе нужны главные слова, а не одинаковый вес всех слогов.', teacherNote: 'Фразовое ударение часто сильнее всего выдаёт русский ритм.', words: ['I need coffee', 'She likes music', 'We are going home', 'The weather looks okay', 'Can you help me', 'I want to try again', 'This is very important', 'He bought a new car', 'They live in London', 'We should start today', 'I saw him yesterday', 'The lesson starts now', 'Please call me later', 'She works every morning', 'I do not understand', 'Tell me what happened', 'I need more practice', 'The answer is simple', 'We can do it', 'Let us try again'], pairs: [['I need COFFEE', 'I NEED coffee'], ['She likes MUSIC', 'SHE likes music'], ['going HOME', 'GOING home'], ['weather OKAY', 'WEATHER okay'], ['help ME', 'HELP me'], ['try AGAIN', 'TRY again'], ['very IMPORTANT', 'VERY important'], ['new CAR', 'NEW car'], ['in LONDON', 'IN London'], ['start TODAY', 'START today']], lines: ['I need coffee', 'I really need coffee', 'I really need coffee today', 'I really need coffee today before class', 'I really need coffee today before class starts'] }),
  makeLesson({ id: 'weak-forms', sectionId: 'rhythm-connected', title: 'Weak forms', shortTitle: 'weak forms', targetSound: 'weak forms', marker: 'to, of, and, can не должны звучать слишком тяжело.', teacherNote: 'Слабые формы делают речь живой и менее механической.', words: ['cup of tea', 'piece of cake', 'bread and butter', 'you and me', 'can I', 'can you', 'to the park', 'to school', 'for a while', 'from the shop', 'at the door', 'in the morning', 'on the table', 'as soon as', 'a lot of', 'kind of', 'sort of', 'out of', 'going to', 'want to'], pairs: [['cup of', 'cup off'], ['bread and', 'bread end'], ['can I', 'can eye'], ['to the', 'two the'], ['for a', 'four a'], ['from the', 'from thee'], ['at the', 'ate the'], ['in the', 'inn thee'], ['going to', 'going two'], ['want to', 'want two']], lines: ['cup of tea', 'a cup of tea', 'a cup of tea and', 'a cup of tea and a piece', 'a cup of tea and a piece of cake'] }),
  makeLesson({ id: 'linking', sectionId: 'rhythm-connected', title: 'Linking', shortTitle: 'linking', targetSound: 'linking', marker: 'слова в живой речи соединяются, а не стоят отдельно.', teacherNote: 'Linking переносит звук из отдельных слов в речь.', words: ['pick it up', 'turn it on', 'look at it', 'go out', 'come in', 'right away', 'far away', 'all of us', 'one of them', 'tell him', 'call her', 'give it', 'leave it', 'move on', 'an apple', 'an orange', 'in a minute', 'on a table', 'at eight', 'for example'], pairs: [['pick it', 'pick kit'], ['turn it', 'turn nit'], ['look at', 'look cat'], ['go out', 'goat'], ['come in', 'coming'], ['right away', 'right a way'], ['far away', 'far a way'], ['all of', 'olive'], ['tell him', 'tellim'], ['call her', 'caller']], lines: ['pick it up', 'pick it up and', 'pick it up and turn', 'pick it up and turn it', 'pick it up and turn it on'] }),
  makeLesson({ id: 'intonation-falling-rising', sectionId: 'rhythm-connected', title: 'Intonation falling/rising', shortTitle: 'intonation', targetSound: 'intonation', marker: 'интонация не должна звучать плоско или резко.', teacherNote: 'Интонация влияет на естественность и дружелюбность речи.', words: ['Really?', 'Are you sure?', 'I think so.', 'That sounds good.', 'Can you help?', 'Where are you going?', 'I do not know.', 'Maybe later.', 'That is interesting.', 'Let us try.', 'Do you like it?', 'It is ready.', 'What happened?', 'No problem.', 'See you later.', 'Could you repeat?', 'I understand.', 'Not today.', 'Sounds great.', 'Thank you.'], pairs: [['Really?', 'Really.'], ['Are you sure?', 'You are sure.'], ['Can you help?', 'You can help.'], ['Where are you going?', 'You are going.'], ['Do you like it?', 'You like it.'], ['Could you repeat?', 'You could repeat.'], ['What happened?', 'It happened.'], ['No problem?', 'No problem.'], ['Sounds great?', 'Sounds great.'], ['Thank you?', 'Thank you.']], lines: ['Really?', 'Are you sure?', 'Are you sure it is ready?', 'Are you sure it is ready today?', 'Are you sure it is ready today or maybe later?'] }),
  makeLesson({ id: 'rhythm-shadowing', sectionId: 'rhythm-connected', title: 'Rhythm shadowing', shortTitle: 'rhythm', targetSound: 'rhythm', marker: 'ритм должен быть живым, не одинаково тяжёлым.', teacherNote: 'Короткий shadowing переносит звуки в живую речь.', words: ['I want to try again', 'Can you say it slowly', 'We need a little time', 'This is not a problem', 'Tell me what you think', 'I can do it today', 'Let us go back home', 'She works in the morning', 'He wants a cup of tea', 'They are waiting for us', 'I really like this idea', 'We should talk about it', 'Could you help me later', 'The answer is quite simple', 'I need one more minute', 'This sounds much better', 'Try it one more time', 'We can start right now', 'It is getting easier', 'That was very clear'], pairs: [['I want to TRY again', 'I WANT to try again'], ['say it SLOWLY', 'SAY it slowly'], ['little TIME', 'LITTLE time'], ['not a PROBLEM', 'NOT a problem'], ['what you THINK', 'WHAT you think'], ['do it TODAY', 'DO it today'], ['back HOME', 'BACK home'], ['in the MORNING', 'IN the morning'], ['cup of TEA', 'CUP of tea'], ['waiting for US', 'WAITING for us']], lines: ['I want to try again', 'I want to try again today', 'I want to try again today with', 'I want to try again today with a little', 'I want to try again today with a little more rhythm'] }),
]

export const ALL_ACCENT_LESSONS: AccentLesson[] = [...ACCENT_LESSONS, ...MORE_LESSONS, ...FINAL_LESSONS]
