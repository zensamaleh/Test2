import type { 
  AIProvider, 
  ChatRequest, 
  AIResponse, 
  AIError,
  ChatMessage
} from '../types/ai.types'

// Configuration des providers IA
const OPENROUTER_PROVIDER: AIProvider = {
  name: 'OpenRouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  models: [],
  headers: (apiKey: string) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin,
    'X-Title': 'GemCraft V2'
  }),
  transformRequest: (request: ChatRequest) => {
    const messages: ChatMessage[] = []
    
    // Ajouter le prompt système s'il existe
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      })
    }
    
    // Ajouter les messages de la conversation
    messages.push(...request.messages)
    
    return {
      model: request.model,
      messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
      stream: false
    }
  },
  transformResponse: (response: any): AIResponse => {
    const choice = response.choices?.[0]
    if (!choice) {
      throw new Error('Réponse invalide de l\'API')
    }
    
    return {
      content: choice.message?.content || '',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0
      } : undefined,
      model: response.model || '',
      finishReason: choice.finish_reason
    }
  }
}

// Service IA principal
export class AIService {
  private providers: Map<string, AIProvider> = new Map()
  
  constructor() {
    this.providers.set('openrouter', OPENROUTER_PROVIDER)
  }
  
  async generateResponse(request: ChatRequest): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      // Déterminer le provider basé sur le modèle
      const provider = this.getProviderForModel(request.model)
      const apiKey = this.getApiKey(provider.name)
      
      if (!apiKey) {
        throw this.createError(
          `Clé API manquante pour ${provider.name}`,
          'api_key'
        )
      }
      
      // Transformer la requête selon le provider
      const transformedRequest = provider.transformRequest(request)
      
      // Faire l'appel API
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: provider.headers(apiKey),
        body: JSON.stringify(transformedRequest)
      })
      
      if (!response.ok) {
        await this.handleAPIError(response)
      }
      
      const data = await response.json()
      
      // Transformer la réponse
      const aiResponse = provider.transformResponse(data)
      
      // Ajouter les métadonnées de performance
      const processingTime = Date.now() - startTime
      
      return {
        ...aiResponse,
        usage: {
          ...aiResponse.usage,
          processingTime
        }
      } as AIResponse
      
    } catch (error: any) {
      console.error('Erreur service IA:', error)
      
      if (error.type) {
        throw error // Erreur AI déjà formatée
      }
      
      throw this.createError(
        error.message || 'Erreur inconnue du service IA',
        'unknown'
      )
    }
  }
  
  private getProviderForModel(modelId: string): AIProvider {
    // Pour l'instant, tous les modèles utilisent OpenRouter
    const provider = this.providers.get('openrouter')
    if (!provider) {
      throw this.createError('Provider OpenRouter non configuré', 'unknown')
    }
    return provider
  }
  
  private getApiKey(providerName: string): string | null {
    switch (providerName.toLowerCase()) {
      case 'openrouter':
        return import.meta.env.VITE_OPENROUTER_API_KEY || null
      default:
        return null
    }
  }
  
  private async handleAPIError(response: Response): Promise<never> {
    let errorMessage = `Erreur API: ${response.status} ${response.statusText}`
    let errorType: AIError['type'] = 'unknown'
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.error?.message || errorMessage
      
      // Détecter le type d'erreur
      if (response.status === 401) {
        errorType = 'api_key'
        errorMessage = 'Clé API invalide ou manquante'
      } else if (response.status === 429) {
        errorType = 'rate_limit'
        errorMessage = 'Limite de taux atteinte. Veuillez patienter.'
      } else if (response.status >= 400 && response.status < 500) {
        errorType = 'model_error'
      } else if (response.status >= 500) {
        errorType = 'network'
        errorMessage = 'Erreur serveur. Veuillez réessayer.'
      }
    } catch {
      // Erreur lors du parsing JSON, utiliser le message par défaut
    }
    
    throw this.createError(errorMessage, errorType)
  }
  
  private createError(message: string, type: AIError['type']): AIError {
    return {
      message,
      type
    } as AIError
  }
  
  // Méthodes utilitaires
  getAvailableModels(): string[] {
    return [
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-r1-0528:free'
    ]
  }
  
  isModelAvailable(modelId: string): boolean {
    return this.getAvailableModels().includes(modelId)
  }
  
  getModelInfo(modelId: string) {
    const models = {
      'google/gemini-2.0-flash-exp:free': {
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        free: true,
        description: 'Modèle le plus récent et performant de Google'
      },
      'deepseek/deepseek-r1-0528:free': {
        name: 'DeepSeek R1',
        provider: 'DeepSeek', 
        free: true,
        description: 'Excellent pour le raisonnement complexe'
      }
    }
    
    return models[modelId as keyof typeof models] || null
  }
}

// Instance singleton du service IA
export const aiService = new AIService()