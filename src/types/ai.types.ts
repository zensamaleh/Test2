// Types pour les services IA
export interface AIProvider {
  name: string
  baseUrl: string
  models: AIModel[]
  headers: (apiKey: string) => Record<string, string>
  transformRequest: (request: ChatRequest) => any
  transformResponse: (response: any) => AIResponse
}

export interface AIModel {
  id: string
  name: string
  provider: string
  contextWindow: number
  maxTokens: number
  pricing?: {
    input: number
    output: number
  }
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    processingTime?: number
  }
  model: string
  finishReason?: string
}

export interface AIError {
  message: string
  code?: string
  type: 'rate_limit' | 'api_key' | 'model_error' | 'network' | 'unknown'
}

// Modèles disponibles
export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Gratuit)',
    provider: 'openrouter',
    contextWindow: 1048576,
    maxTokens: 8192
  },
  {
    id: 'deepseek/deepseek-r1-0528:free',
    name: 'DeepSeek R1 (Gratuit)',
    provider: 'openrouter',
    contextWindow: 128000,
    maxTokens: 4096
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openrouter',
    contextWindow: 16385,
    maxTokens: 4096,
    pricing: { input: 0.0005, output: 0.0015 }
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openrouter',
    contextWindow: 128000,
    maxTokens: 16384,
    pricing: { input: 0.00015, output: 0.0006 }
  }
]