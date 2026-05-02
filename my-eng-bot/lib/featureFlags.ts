export const featureFlags = {
  practiceEngineV1: process.env.NEXT_PUBLIC_FEATURE_PRACTICE_ENGINE_V1 !== 'false',
  accentTrainerV1: process.env.NEXT_PUBLIC_FEATURE_ACCENT_TRAINER_V1 !== 'false',
} as const

