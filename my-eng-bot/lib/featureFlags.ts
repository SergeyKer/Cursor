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
} as const

