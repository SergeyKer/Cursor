import { classifyOpenAiForbidden } from '@/lib/openAiForbidden'

export type AiProviderId = 'openai' | 'openrouter'

export type ProviderErrorCode = 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error'

export type BuildProviderUserMessageParams = {
  provider: AiProviderId
  status: number
  errText: string
  /** Fallback when status does not match a known branch. */
  defaultMessage?: string
  /** Override for HTTP 429 (translate uses a shorter phrase). */
  rateLimitMessage?: string
}

export function buildProviderUserMessage(params: BuildProviderUserMessageParams): {
  userMessage: string
  errorCode: ProviderErrorCode
} {
  const { provider, status, errText } = params
  const defaultMessage = params.defaultMessage ?? 'Сейчас ИИ недоступен. Подождите немного и попробуйте ещё раз.'
  const rateLimitMessage =
    params.rateLimitMessage ?? 'Слишком много запросов к ИИ. Подождите немного и попробуйте ещё раз.'

  if (status === 401) {
    return {
      errorCode: 'unauthorized',
      userMessage:
        provider === 'openai'
          ? 'Неверный ключ OpenAI. Проверьте OPENAI_API_KEY.'
          : 'Неверный ключ OpenRouter. Проверьте OPENROUTER_API_KEY.',
    }
  }

  if (status === 403 && provider === 'openai') {
    const forbiddenType = classifyOpenAiForbidden(errText)
    return {
      errorCode: 'forbidden',
      userMessage:
        forbiddenType === 'unsupported_region'
          ? 'OpenAI недоступен из вашего региона (403 unsupported_country_region_territory). Переключитесь на OpenRouter или используйте деплой (например, Vercel) в поддерживаемом регионе.'
          : 'Доступ к OpenAI запрещён (403). Проверьте доступность сервиса в вашем регионе и права проекта/аккаунта.',
    }
  }

  if (status === 429) {
    return { errorCode: 'rate_limit', userMessage: rateLimitMessage }
  }

  if (status === 502 && /fetch failed|econnreset|tls|enotfound|etimedout|proxy/i.test(errText)) {
    return {
      errorCode: 'upstream_error',
      userMessage: 'Нет соединения с провайдером ИИ (сеть/прокси/VPN). Проверьте прокси и попробуйте ещё раз.',
    }
  }

  return { errorCode: 'upstream_error', userMessage: defaultMessage }
}

export const PRACTICE_REFERENCE_FALLBACK_NOTICE =
  'ИИ не вернул валидное задание — запущен локальный эталон для отладки (7 одинаковых шагов).'
