import { Tense } from '../types';

export const tensesData: Tense[] = [
  {
    id: 'present-simple',
    name: 'Present Simple',
    order: 1,
    theory: {
      explanation:
        'Present Simple (Простое настоящее время) используется для регулярных действий, привычек, фактов и расписаний.',
      markers: ['always', 'usually', 'often', 'sometimes', 'never', 'every day'],
      formula: {
        positive: 'S + V/V(s/es)',
        negative: 'S + do/does not + V',
        question: 'Do/Does + S + V?',
      },
      examples: [
        { positive: 'I work every day.', negative: "I don't work every day.", question: 'Do you work every day?', ru: 'Я работаю каждый день.' },
        { positive: 'She likes coffee.', negative: "She doesn't like coffee.", question: 'Does she like coffee?', ru: 'Она любит кофе.' },
        { positive: 'They play football on Sundays.', negative: "They don't play on Mondays.", question: 'Do they play football?', ru: 'Они играют в футбол по воскресеньям.' },
      ],
    },
    quiz: [
      { id: 'ps-q1', russian: 'Он часто читает книги.', options: ['He often read books.', 'He often reads books.', 'He is often reading books.'], correctIndex: 1 },
      { id: 'ps-q2', russian: 'Они не работают по выходным.', options: ["They don't work on weekends.", "They aren't work on weekends.", "They doesn't work on weekends."], correctIndex: 0 },
      { id: 'ps-q3', russian: 'Она говорит по-английски?', options: ['Do she speaks English?', 'Is she speak English?', 'Does she speak English?'], correctIndex: 2 },
    ],
  },
  {
    id: 'present-continuous',
    name: 'Present Continuous',
    order: 2,
    theory: {
      explanation:
        'Present Continuous (Настоящее длительное) используется для действий, происходящих сейчас, или для запланированных действий в ближайшем будущем.',
      markers: ['now', 'at the moment', 'today', 'this week', 'tomorrow'],
      formula: {
        positive: 'S + am/is/are + V-ing',
        negative: 'S + am/is/are not + V-ing',
        question: 'Am/Is/Are + S + V-ing?',
      },
      examples: [
        { positive: 'I am reading now.', negative: "I am not reading now.", question: 'Are you reading?', ru: 'Я сейчас читаю.' },
        { positive: 'She is cooking dinner.', negative: "She isn't cooking dinner.", question: 'Is she cooking dinner?', ru: 'Она готовит ужин.' },
        { positive: 'We are leaving tomorrow.', negative: "We aren't leaving tomorrow.", question: 'Are we leaving tomorrow?', ru: 'Мы уезжаем завтра.' },
      ],
    },
    quiz: [
      { id: 'pc-q1', russian: 'Я сейчас готовлю ужин.', options: ['I cook dinner now.', 'I am cooking dinner now.', 'I cooking dinner now.'], correctIndex: 1 },
      { id: 'pc-q2', russian: 'Они не смотрят телевизор.', options: ["They don't watching TV.", "They aren't watching TV.", "They not watching TV."], correctIndex: 1 },
      { id: 'pc-q3', russian: 'Он работает сейчас?', options: ['Is he working now?', 'Does he working now?', 'Do he work now?'], correctIndex: 0 },
    ],
  },
  {
    id: 'past-simple',
    name: 'Past Simple',
    order: 3,
    theory: {
      explanation:
        'Past Simple (Простое прошедшее) используется для завершённых действий в прошлом. Обычно с указанием времени или контекста.',
      markers: ['yesterday', 'last week', 'ago', 'in 2020', 'when I was young'],
      formula: {
        positive: 'S + V2',
        negative: 'S + did not + V',
        question: 'Did + S + V?',
      },
      examples: [
        { positive: 'I worked yesterday.', negative: "I didn't work yesterday.", question: 'Did you work yesterday?', ru: 'Я работал вчера.' },
        { positive: 'She went to London.', negative: "She didn't go to London.", question: 'Did she go to London?', ru: 'Она поехала в Лондон.' },
        { positive: 'They saw the film.', negative: "They didn't see the film.", question: 'Did they see the film?', ru: 'Они посмотрели фильм.' },
      ],
    },
    quiz: [
      { id: 'past-q1', russian: 'Он вчера купил машину.', options: ['He bought a car yesterday.', 'He buyed a car yesterday.', 'He has bought a car yesterday.'], correctIndex: 0 },
      { id: 'past-q2', russian: 'Мы не были дома.', options: ["We didn't be at home.", "We weren't at home.", "We wasn't at home."], correctIndex: 1 },
      { id: 'past-q3', russian: 'Ты видел её?', options: ['Did you see her?', 'Did you saw her?', 'Do you see her?'], correctIndex: 0 },
    ],
  },
  // 4. Past Continuous
  {
    id: 'past-continuous',
    name: 'Past Continuous',
    order: 4,
    theory: {
      explanation:
        'Past Continuous (Прошедшее длительное) описывает действие, которое длилось в определённый момент в прошлом, или действие, прерванное другим. Часто используется с Past Simple.',
      markers: ['at 5 o\'clock yesterday', 'all day yesterday', 'when', 'while', 'at that moment'],
      formula: {
        positive: 'S + was/were + V-ing',
        negative: 'S + was/were not + V-ing',
        question: 'Was/Were + S + V-ing?',
      },
      examples: [
        { positive: 'I was reading at 6 pm yesterday.', negative: "I wasn't reading at 6 pm.", question: 'Were you reading at 6 pm?', ru: 'Я читал в 6 вечера вчера.' },
        { positive: 'She was cooking when I called.', negative: "She wasn't cooking when I called.", question: 'Was she cooking when you called?', ru: 'Она готовила, когда я позвонил.' },
        { positive: 'They were playing football all afternoon.', negative: "They weren't playing football.", question: 'Were they playing football?', ru: 'Они играли в футбол всё послеполуденное.' },
      ],
    },
    quiz: [
      { id: 'pastc-q1', russian: 'Он смотрел телевизор вчера вечером.', options: ['He watched TV yesterday evening.', 'He was watching TV yesterday evening.', 'He is watching TV yesterday evening.'], correctIndex: 1 },
      { id: 'pastc-q2', russian: 'Мы не ждали тебя в тот момент.', options: ["We didn't wait for you at that moment.", "We weren't waiting for you at that moment.", "We wasn't waiting for you at that moment."], correctIndex: 1 },
      { id: 'pastc-q3', russian: 'Что ты делал, когда она пришла?', options: ['What did you do when she came?', 'What were you doing when she came?', 'What you were doing when she came?'], correctIndex: 1 },
    ],
  },
  // 5. Present Perfect
  {
    id: 'present-perfect',
    name: 'Present Perfect',
    order: 5,
    theory: {
      explanation:
        'Present Perfect (Настоящее совершённое) связывает прошлое с настоящим: результат к настоящему моменту, опыт, недавние действия. Время совершения не указано или неважно.',
      markers: ['already', 'yet', 'just', 'ever', 'never', 'recently', 'this week', 'since', 'for'],
      formula: {
        positive: 'S + have/has + V3',
        negative: 'S + have/has not + V3',
        question: 'Have/Has + S + V3?',
      },
      examples: [
        { positive: 'I have finished my work.', negative: "I haven't finished my work yet.", question: 'Have you finished your work?', ru: 'Я закончил работу.' },
        { positive: 'She has been to London.', negative: "She hasn't been to London.", question: 'Has she been to London?', ru: 'Она была в Лондоне.' },
        { positive: 'They have lived here for five years.', negative: "They haven't lived here long.", question: 'How long have they lived here?', ru: 'Они живут здесь пять лет.' },
      ],
    },
    quiz: [
      { id: 'pp-q1', russian: 'Я уже видел этот фильм.', options: ['I already saw this film.', 'I have already seen this film.', 'I have already saw this film.'], correctIndex: 1 },
      { id: 'pp-q2', russian: 'Она ещё не пришла.', options: ["She hasn't come yet.", "She didn't come yet.", "She hasn't came yet."], correctIndex: 0 },
      { id: 'pp-q3', russian: 'Ты когда-нибудь был в Париже?', options: ['Did you ever be in Paris?', 'Have you ever been to Paris?', 'Have you ever was in Paris?'], correctIndex: 1 },
    ],
  },
  // 6. Present Perfect Continuous
  {
    id: 'present-perfect-continuous',
    name: 'Present Perfect Continuous',
    order: 6,
    theory: {
      explanation:
        'Present Perfect Continuous (Настоящее совершённое длительное) подчёркивает длительность действия от момента в прошлом до настоящего (или недавно закончившегося). Часто с for/since.',
      markers: ['for', 'since', 'all day', 'all week', 'how long', 'lately', 'recently'],
      formula: {
        positive: 'S + have/has been + V-ing',
        negative: 'S + have/has not been + V-ing',
        question: 'Have/Has + S + been + V-ing?',
      },
      examples: [
        { positive: 'I have been waiting for an hour.', negative: "I haven't been waiting long.", question: 'How long have you been waiting?', ru: 'Я жду уже час.' },
        { positive: 'She has been studying since morning.', negative: "She hasn't been studying all day.", question: 'Has she been studying long?', ru: 'Она учится с утра.' },
        { positive: 'They have been living here since 2020.', negative: "They haven't been living here long.", question: 'How long have they been living here?', ru: 'Они живут здесь с 2020 года.' },
      ],
    },
    quiz: [
      { id: 'ppc-q1', russian: 'Он работает здесь уже три года.', options: ['He works here for three years.', 'He has been working here for three years.', 'He has worked here for three years.'], correctIndex: 1 },
      { id: 'ppc-q2', russian: 'Мы не ждём тебя весь день.', options: ["We haven't been waiting for you all day.", "We don't wait for you all day.", "We haven't waited for you all day."], correctIndex: 0 },
      { id: 'ppc-q3', russian: 'Как долго ты учишь английский?', options: ['How long do you learn English?', 'How long have you been learning English?', 'How long have you learned English?'], correctIndex: 1 },
    ],
  },
  // 7. Past Perfect
  {
    id: 'past-perfect',
    name: 'Past Perfect',
    order: 7,
    theory: {
      explanation:
        'Past Perfect (Прошедшее совершённое) выражает действие, завершённое до другого действия или момента в прошлом. «Предпрошедшее» время.',
      markers: ['before', 'after', 'by the time', 'already', 'just', 'when', 'by yesterday'],
      formula: {
        positive: 'S + had + V3',
        negative: 'S + had not + V3',
        question: 'Had + S + V3?',
      },
      examples: [
        { positive: 'I had left before she arrived.', negative: "I hadn't left when she arrived.", question: 'Had you left before she arrived?', ru: 'Я ушёл до того, как она пришла.' },
        { positive: 'She had already finished the report.', negative: "She hadn't finished the report yet.", question: 'Had she finished the report?', ru: 'Она уже закончила отчёт.' },
        { positive: 'They had gone home by 9 pm.', negative: "They hadn't gone home by 9 pm.", question: 'Had they gone home by 9 pm?', ru: 'Они ушли домой к 9 вечера.' },
      ],
    },
    quiz: [
      { id: 'pastp-q1', russian: 'К тому времени я уже прочитал книгу.', options: ['By that time I already read the book.', 'By that time I had already read the book.', 'By that time I have already read the book.'], correctIndex: 1 },
      { id: 'pastp-q2', russian: 'Она не видела его до вечеринки.', options: ["She didn't see him before the party.", "She hadn't seen him before the party.", "She hasn't seen him before the party."], correctIndex: 1 },
      { id: 'pastp-q3', russian: 'Ты уже поужинал, когда я позвонил?', options: ['Did you already have dinner when I called?', 'Had you already had dinner when I called?', 'Have you already had dinner when I called?'], correctIndex: 1 },
    ],
  },
  // 8. Past Perfect Continuous
  {
    id: 'past-perfect-continuous',
    name: 'Past Perfect Continuous',
    order: 8,
    theory: {
      explanation:
        'Past Perfect Continuous (Прошедшее совершённое длительное) подчёркивает длительность действия, которое происходило до другого действия в прошлом. Часто с for/since.',
      markers: ['for', 'since', 'before', 'when', 'how long', 'all day', 'by the time'],
      formula: {
        positive: 'S + had been + V-ing',
        negative: 'S + had not been + V-ing',
        question: 'Had + S + been + V-ing?',
      },
      examples: [
        { positive: 'I had been working for two hours when he came.', negative: "I hadn't been working long when he came.", question: 'How long had you been working when he came?', ru: 'Я работал уже два часа, когда он пришёл.' },
        { positive: 'She had been waiting since 5 pm.', negative: "She hadn't been waiting long.", question: 'Had she been waiting long?', ru: 'Она ждала с 5 вечера.' },
        { positive: 'They had been living there for years before they moved.', negative: "They hadn't been living there long.", question: 'How long had they been living there?', ru: 'Они жили там годами, прежде чем переехали.' },
      ],
    },
    quiz: [
      { id: 'pastpc-q1', russian: 'Он учился два часа, когда мы пришли.', options: ['He studied for two hours when we came.', 'He had been studying for two hours when we came.', 'He has been studying for two hours when we came.'], correctIndex: 1 },
      { id: 'pastpc-q2', russian: 'Мы не ждали так долго до его прихода.', options: ["We didn't wait so long before he came.", "We hadn't been waiting so long before he came.", "We haven't been waiting so long before he came."], correctIndex: 1 },
      { id: 'pastpc-q3', russian: 'Как долго она работала, когда ты её увидел?', options: ['How long did she work when you saw her?', 'How long had she been working when you saw her?', 'How long has she been working when you saw her?'], correctIndex: 1 },
    ],
  },
  // 9. Future Simple
  {
    id: 'future-simple',
    name: 'Future Simple',
    order: 9,
    theory: {
      explanation:
        'Future Simple (Простое будущее) с will выражает факты или решения о будущем, предсказания, обещания, спонтанные решения. Отрицание и вопрос: will not (won\'t), Will + S + V?',
      markers: ['tomorrow', 'next week', 'in the future', 'soon', 'later', 'in 2030'],
      formula: {
        positive: 'S + will + V',
        negative: 'S + will not (won\'t) + V',
        question: 'Will + S + V?',
      },
      examples: [
        { positive: 'I will call you tomorrow.', negative: "I won't call you tomorrow.", question: 'Will you call me tomorrow?', ru: 'Я позвоню тебе завтра.' },
        { positive: 'She will finish the project next week.', negative: "She won't finish the project soon.", question: 'Will she finish the project next week?', ru: 'Она закончит проект на следующей неделе.' },
        { positive: 'They will buy a new car.', negative: "They won't buy a new car.", question: 'Will they buy a new car?', ru: 'Они купят новую машину.' },
      ],
    },
    quiz: [
      { id: 'fut-q1', russian: 'Он приедет в понедельник.', options: ['He comes on Monday.', 'He will come on Monday.', 'He is coming on Monday.'], correctIndex: 1 },
      { id: 'fut-q2', russian: 'Мы не будем ждать долго.', options: ["We don't wait long.", "We won't wait long.", "We will not to wait long."], correctIndex: 1 },
      { id: 'fut-q3', russian: 'Ты поможешь мне?', options: ['Do you help me?', 'Will you help me?', 'Are you help me?'], correctIndex: 1 },
    ],
  },
  // 10. Future Continuous
  {
    id: 'future-continuous',
    name: 'Future Continuous',
    order: 10,
    theory: {
      explanation:
        'Future Continuous (Будущее длительное) описывает действие, которое будет происходить в определённый момент или период в будущем. Часто для вежливых вопросов о планах.',
      markers: ['at 5 pm tomorrow', 'this time next week', 'all day tomorrow', 'when you arrive'],
      formula: {
        positive: 'S + will be + V-ing',
        negative: 'S + will not be + V-ing',
        question: 'Will + S + be + V-ing?',
      },
      examples: [
        { positive: 'I will be working at 6 pm tomorrow.', negative: "I won't be working at 6 pm tomorrow.", question: 'Will you be working at 6 pm tomorrow?', ru: 'Я буду работать завтра в 6 вечера.' },
        { positive: 'She will be waiting for you at the station.', negative: "She won't be waiting at the station.", question: 'Will she be waiting at the station?', ru: 'Она будет ждать тебя на вокзале.' },
        { positive: 'They will be travelling all next week.', negative: "They won't be travelling next week.", question: 'Will they be travelling next week?', ru: 'Они будут путешествовать всю следующую неделю.' },
      ],
    },
    quiz: [
      { id: 'futc-q1', russian: 'В это время завтра мы будем лететь в Париж.', options: ['At this time tomorrow we fly to Paris.', 'At this time tomorrow we will be flying to Paris.', 'At this time tomorrow we will fly to Paris.'], correctIndex: 1 },
      { id: 'futc-q2', russian: 'Он не будет работать в выходные.', options: ["He won't work at the weekend.", "He won't be working at the weekend.", "He will not working at the weekend."], correctIndex: 1 },
      { id: 'futc-q3', russian: 'Ты будешь ждать меня в аэропорту?', options: ['Will you wait for me at the airport?', 'Will you be waiting for me at the airport?', 'Do you wait for me at the airport?'], correctIndex: 1 },
    ],
  },
  // 11. Future Perfect
  {
    id: 'future-perfect',
    name: 'Future Perfect',
    order: 11,
    theory: {
      explanation:
        'Future Perfect (Будущее совершённое) выражает действие, которое будет завершено к определённому моменту в будущем. Часто с by + время.',
      markers: ['by tomorrow', 'by next week', 'by 2030', 'by the time', 'before'],
      formula: {
        positive: 'S + will have + V3',
        negative: 'S + will not have + V3',
        question: 'Will + S + have + V3?',
      },
      examples: [
        { positive: 'I will have finished by 5 pm.', negative: "I won't have finished by 5 pm.", question: 'Will you have finished by 5 pm?', ru: 'Я закончу к 5 вечера.' },
        { positive: 'She will have left by the time you arrive.', negative: "She won't have left yet.", question: 'Will she have left by then?', ru: 'Она уедет к тому времени, как ты приедешь.' },
        { positive: 'They will have completed the project by Friday.', negative: "They won't have completed it by Friday.", question: 'Will they have completed it by Friday?', ru: 'Они завершат проект к пятнице.' },
      ],
    },
    quiz: [
      { id: 'futp-q1', russian: 'К завтрашнему вечеру я закончу отчёт.', options: ['By tomorrow evening I finish the report.', 'By tomorrow evening I will have finished the report.', 'By tomorrow evening I will finish the report.'], correctIndex: 1 },
      { id: 'futp-q2', russian: 'Она ещё не уйдёт к 6 часам.', options: ["She won't have left by 6 o'clock.", "She won't leave by 6 o'clock.", "She will not have left by 6 o'clock."], correctIndex: 0 },
      { id: 'futp-q3', russian: 'Ты сдашь экзамен к июню?', options: ['Will you pass the exam by June?', 'Will you have passed the exam by June?', 'Do you pass the exam by June?'], correctIndex: 1 },
    ],
  },
  // 12. Future Perfect Continuous
  {
    id: 'future-perfect-continuous',
    name: 'Future Perfect Continuous',
    order: 12,
    theory: {
      explanation:
        'Future Perfect Continuous (Будущее совершённое длительное) подчёркивает длительность действия до момента в будущем. Используется реже, часто с by ... for.',
      markers: ['by next month', 'for two hours', 'by the end of', 'when'],
      formula: {
        positive: 'S + will have been + V-ing',
        negative: 'S + will not have been + V-ing',
        question: 'Will + S + have been + V-ing?',
      },
      examples: [
        { positive: 'By June I will have been working here for a year.', negative: "By June I won't have been working here for a year.", question: 'How long will you have been working here by June?', ru: 'К июню я буду работать здесь год.' },
        { positive: 'She will have been studying for three hours by 5 pm.', negative: "She won't have been studying for three hours.", question: 'How long will she have been studying by 5 pm?', ru: 'К 5 вечера она будет учиться уже три часа.' },
        { positive: 'They will have been living there for ten years next month.', negative: "They won't have been living there for ten years.", question: 'How long will they have been living there?', ru: 'В следующем месяце они будут жить там десять лет.' },
      ],
    },
    quiz: [
      { id: 'futpc-q1', russian: 'К декабрю мы будем учить английский два года.', options: ['By December we learn English for two years.', 'By December we will have been learning English for two years.', 'By December we will learn English for two years.'], correctIndex: 1 },
      { id: 'futpc-q2', russian: 'Он не будет ждать три часа к тому времени.', options: ["He won't wait for three hours by then.", "He won't have been waiting for three hours by then.", "He will not have been wait for three hours by then."], correctIndex: 1 },
      { id: 'futpc-q3', russian: 'Как долго ты будешь работать здесь к 2026 году?', options: ['How long will you work here by 2026?', 'How long will you have been working here by 2026?', 'How long do you work here by 2026?'], correctIndex: 1 },
    ],
  },
];
