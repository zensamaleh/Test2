import { useState } from 'react'
import { aiService } from '../lib/aiService'
import { RAGService } from '../lib/ragService'
import { EmbeddingService } from '../lib/embeddingService'
import type { ChatRequest, AIResponse, AIError, ChatMessage } from '../types/ai.types'
import type { Gem, Message } from '../types'
import type { RAGConfig, RAGSearchResult } from '../types/rag.types'
import { DEFAULT_RAG_CONFIG } from '../types/rag.types'

interface UseAIOptions {
  onSuccess?: (response: AIResponse) => void
  onError?: (error: AIError) => void
  enableRAG?: boolean
  ragConfig?: RAGConfig
  onRAGSearch?: (result: RAGSearchResult) => void
}

interface EnhancedAIResponse extends AIResponse {
  ragContext?: {
    searchResult: RAGSearchResult
    sources: string[]
    contextUsed: boolean
  }
}

export function useAI(options?: UseAIOptions) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AIError | null>(null)

  const generateResponse = async (
    gem: Gem,
    messages: Message[],
    userMessage: string,
    useRAG: boolean = options?.enableRAG ?? true
  ): Promise<EnhancedAIResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      let ragContext: EnhancedAIResponse['ragContext'] | undefined
      let enhancedPrompt = gem.prompt
      
      // Recherche RAG si activée et configurée
      if (useRAG) {
        try {
          const ragService = RAGService.getInstance()
          const embeddingService = EmbeddingService.getInstance()
          
          // Vérifier si le gem a des embeddings et si le service est configuré
          const hasEmbeddings = await ragService.hasEmbeddings(gem.id)
          const isConfigured = embeddingService.isConfigured()
          
          if (hasEmbeddings && isConfigured) {
            console.log('🔍 Recherche RAG activée pour:', userMessage)
            
            // Effectuer la recherche sémantique
            const searchResult = await ragService.searchForAI(
              gem.id,
              userMessage,
              options?.ragConfig || DEFAULT_RAG_CONFIG
            )
            
            // Informer du résultat de la recherche
            options?.onRAGSearch?.(searchResult.searchResult)
            
            if (searchResult.context && searchResult.context.trim().length > 0) {
              // Enrichir le prompt avec le contexte trouvé
              enhancedPrompt = `${gem.prompt}

=== CONTEXTE DES DONNÉES ===
Voici les informations pertinentes trouvées dans les données pour répondre à la question de l'utilisateur :

${searchResult.context}

=== INSTRUCTIONS ===
- Utilise prioritairement ces informations pour répondre à la question
- Si les données ne contiennent pas l'information demandée, indique-le clairement
- Cite tes sources quand possible
- Reste factuel et précis`
              
              ragContext = {
                searchResult: searchResult.searchResult,
                sources: searchResult.sources,
                contextUsed: true
              }
              
              console.log(`✅ Contexte RAG trouvé: ${searchResult.searchResult.matches.length} correspondances`)
            } else {
              console.log('ℹ️ Aucun contexte pertinent trouvé dans les données')
              ragContext = {
                searchResult: searchResult.searchResult,
                sources: [],
                contextUsed: false
              }
            }
          } else {
            if (!hasEmbeddings) {
              console.log('ℹ️ Pas d\'embeddings disponibles pour ce Gem')
            }
            if (!isConfigured) {
              console.log('ℹ️ Service d\'embeddings non configuré')
            }
          }
        } catch (ragError) {
          console.warn('⚠️ Erreur lors de la recherche RAG:', ragError)
          // Continuer sans RAG en cas d'erreur
        }
      }
      
      // Construire les messages pour l'IA
      const chatMessages: ChatMessage[] = []
      
      // Ajouter les messages précédents (limiter pour éviter de dépasser le contexte)
      const recentMessages = messages.slice(-10) // Garder les 10 derniers messages
      
      for (const msg of recentMessages) {
        chatMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })
      }
      
      // Ajouter le nouveau message utilisateur
      chatMessages.push({
        role: 'user',
        content: userMessage
      })

      // Préparer la requête avec le prompt enrichi
      const request: ChatRequest = {
        model: gem.settings?.model || 'google/gemini-2.0-flash-exp:free',
        messages: chatMessages,
        systemPrompt: enhancedPrompt,
        temperature: gem.settings?.temperature || 0.7,
        maxTokens: gem.settings?.maxTokens || 1000
      }

      // Appeler le service IA
      const response = await aiService.generateResponse(request)
      
      // Créer la réponse enrichie
      const enhancedResponse: EnhancedAIResponse = {
        ...response,
        ragContext
      }
      
      options?.onSuccess?.(enhancedResponse)
      return enhancedResponse

    } catch (err: any) {
      const aiError: AIError = err.type ? err : {
        message: err.message || 'Erreur inconnue',
        type: 'unknown'
      }
      
      setError(aiError)
      options?.onError?.(aiError)
      return null

    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (model: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const request: ChatRequest = {
        model,
        messages: [{ role: 'user', content: 'Bonjour, peux-tu me répondre simplement "OK" pour tester la connexion ?' }],
        systemPrompt: 'Tu es un assistant de test. Réponds simplement et brièvement.',
        temperature: 0.1,
        maxTokens: 10
      }

      await aiService.generateResponse(request)
      return true

    } catch (err: any) {
      const aiError: AIError = err.type ? err : {
        message: err.message || 'Erreur de connexion',
        type: 'network'
      }
      
      setError(aiError)
      return false

    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  // Vérifier si RAG est disponible pour un gem
  const checkRAGAvailability = async (gemId: string): Promise<{
    available: boolean
    hasEmbeddings: boolean
    isConfigured: boolean
  }> => {
    try {
      const ragService = RAGService.getInstance()
      const embeddingService = EmbeddingService.getInstance()
      
      const hasEmbeddings = await ragService.hasEmbeddings(gemId)
      const isConfigured = embeddingService.isConfigured()
      
      return {
        available: hasEmbeddings && isConfigured,
        hasEmbeddings,
        isConfigured
      }
    } catch (error) {
      console.error('Erreur vérification RAG:', error)
      return {
        available: false,
        hasEmbeddings: false,
        isConfigured: false
      }
    }
  }
  
  // Obtenir les statistiques RAG d'un gem
  const getRAGStats = async (gemId: string) => {
    try {
      const ragService = RAGService.getInstance()
      return await ragService.getGemStats(gemId)
    } catch (error) {
      console.error('Erreur stats RAG:', error)
      return null
    }
  }
  
  // Tester la recherche RAG
  const testRAGSearch = async (gemId: string, query: string = 'test') => {
    try {
      const ragService = RAGService.getInstance()
      return await ragService.searchSimilar(gemId, query)
    } catch (error) {
      console.error('Erreur test RAG:', error)
      throw error
    }
  }

  return {
    generateResponse,
    testConnection,
    checkRAGAvailability,
    getRAGStats,
    testRAGSearch,
    loading,
    error,
    clearError,
    isModelAvailable: aiService.isModelAvailable,
    getModelInfo: aiService.getModelInfo,
    getAvailableModels: aiService.getAvailableModels
  }
}