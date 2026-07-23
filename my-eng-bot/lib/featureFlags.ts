export const featureFlags = {
  practiceEngineV1: process.env.NEXT_PUBLIC_FEATURE_PRACTICE_ENGINE_V1 !== 'false',
  practiceEconomyV1: process.env.NEXT_PUBLIC_FEATURE_PRACTICE_ECONOMY_V1 !== 'false',
  practiceGemsV1: process.env.NEXT_PUBLIC_FEATURE_PRACTICE_GEMS_V1 === 'true',
  practiceTopicCupsV1: process.env.NEXT_PUBLIC_FEATURE_PRACTICE_TOPIC_CUPS_V1 !== 'false',
  practiceInstructionBlockV1: process.env.NEXT_PUBLIC_FEATURE_PRACTICE_INSTRUCTION_BLOCK_V1 !== 'false',
  accentTrainerV1: process.env.NEXT_PUBLIC_FEATURE_ACCENT_TRAINER_V1 !== 'false',
  engvoVoiceV1: process.env.NEXT_PUBLIC_FEATURE_ENGVO_VOICE_V1 !== 'false',
  communicationMixVoiceInputV1: process.env.NEXT_PUBLIC_FEATURE_COMMUNICATION_MIX_VOICE_INPUT_V1 !== 'false',
  lessonLocalSilverCapV1: process.env.NEXT_PUBLIC_FEATURE_LESSON_LOCAL_SILVER_CAP_V1 !== 'false',
  languageNoteV1: process.env.NEXT_PUBLIC_FEATURE_LANGUAGE_NOTE_V1 !== 'false',
  /** Маскот на корневом экране дома (приветствие). По умолчанию скрыт. */
  homeMascotVisible: process.env.NEXT_PUBLIC_FEATURE_HOME_MASCOT_VISIBLE === 'true',
  /** Быстрый тест: меню + /test. По умолчанию включён. */
  quickTestV1: process.env.NEXT_PUBLIC_FEATURE_QUICK_TEST_V1 !== 'false',
  /** Тихий assess ошибок в chat/call. Default on; =false только kill-switch. */
  silentAssessV1: process.env.NEXT_PUBLIC_FEATURE_SILENT_ASSESS_V1 !== 'false',
  /** Returning → домашний экран «Мой план». Default on. */
  myPlanHomeV1: process.env.NEXT_PUBLIC_FEATURE_MY_PLAN_HOME_V1 !== 'false',
  /** Новый layout + selectNowGoal. Default on; =false откат к старому списку. */
  myPlanNowGoalV1: process.env.NEXT_PUBLIC_FEATURE_MY_PLAN_NOW_GOAL_V1 !== 'false',
  /** AI reinforce из Мой план. Default off до Premium. */
  aiReinforceV1: process.env.NEXT_PUBLIC_FEATURE_AI_REINFORCE_V1 === 'true',
  /** Сырой лог learning signals в UI. Default off (localhost может форсить). */
  learningMemoryDebugV1: process.env.NEXT_PUBLIC_FEATURE_LEARNING_MEMORY_DEBUG_V1 === 'true',
  /** Справочник-шпаргалки. Default on. */
  referenceV1: process.env.NEXT_PUBLIC_FEATURE_REFERENCE_V1 !== 'false',
  /** Full-screen пространство «Прогресс». Default on; =false → старое меню ProgressPanel. */
  progressSpaceV1: process.env.NEXT_PUBLIC_FEATURE_PROGRESS_SPACE_V1 !== 'false',
} as const

