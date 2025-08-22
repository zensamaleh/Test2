import { useState, useCallback } from 'react'
import { RAGService } from '../lib/ragService'
import { EmbeddingService } from '../lib/embeddingService'
import type { 
  RAGConfig, 
  RAGSearchResult, 
  IndexingStats
} from '../types/rag.types'
import { DEFAULT_RAG_CONFIG, EMBEDDING_PROVIDERS } from '../types/rag.types'

interface UseRAGOptions {
  gemId?: string
  autoDetectProvider?: boolean
}

export function useRAG(options: UseRAGOptions = {}) {
  const [ragService] = useState(() => RAGService.getInstance())
  const [embeddingService] = useState(() => EmbeddingService.getInstance())
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSearchResult, setLastSearchResult] = useState<RAGSearchResult | null>(null)

  // Détecter le meilleur provider disponible (priorité Gemini)
  const detectBestProvider = useCallback((): keyof typeof EMBEDDING_PROVIDERS => {
    if (embeddingService.getGeminiApiKey()) {
      return 'gemini-embedding-004'
    }
    throw new Error('Clé API Gemini requise pour RAG. Obtenez-en une sur https://aistudio.google.com/app/apikey')
  }, [embeddingService])

  const checkAvailability = useCallback(async (gemId?: string) => {
    const targetGemId = gemId || options.gemId
    if (!targetGemId) {
      throw new Error('Gem ID requis')
    }

    try {
      const hasEmbeddings = await ragService.hasEmbeddings(targetGemId)
      const providerConfigured = embeddingService.isConfigured()
      
      return {
        available: hasEmbeddings && providerConfigured,
        hasEmbeddings,
        providerConfigured,
        gemId: targetGemId
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur vérification RAG')
      return {
        available: false,
        hasEmbeddings: false,
        providerConfigured: false,
        gemId: targetGemId
      }
    }
  }, [options.gemId, ragService, embeddingService])

  const search = useCallback(async (
    query: string, 
    gemId?: string,
    customConfig?: Partial<RAGConfig>
  ): Promise<RAGSearchResult | null> => {
    const targetGemId = gemId || options.gemId
    if (!targetGemId) {
      throw new Error('Gem ID requis')
    }

    setLoading(true)
    setError(null)

    try {
      let config = { ...DEFAULT_RAG_CONFIG, ...customConfig }
      
      if (options.autoDetectProvider) {
        config.embeddingProvider = detectBestProvider()
      }

      const result = await ragService.searchSimilar(targetGemId, query, config)
      setLastSearchResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de recherche RAG'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [options.gemId, options.autoDetectProvider, ragService, detectBestProvider])

  const searchForAI = useCallback(async (
    query: string,
    gemId?: string,
    customConfig?: Partial<RAGConfig>
  ) => {
    const targetGemId = gemId || options.gemId
    if (!targetGemId) {
      throw new Error('Gem ID requis')
    }

    setLoading(true)
    setError(null)

    try {
      let config = { ...DEFAULT_RAG_CONFIG, ...customConfig }
      
      if (options.autoDetectProvider) {
        config.embeddingProvider = detectBestProvider()
      }

      const result = await ragService.searchForAI(targetGemId, query, config)
      setLastSearchResult(result.searchResult)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de recherche RAG pour IA'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [options.gemId, options.autoDetectProvider, ragService, detectBestProvider])

  const clearError = useCallback(() => setError(null), [])

  return {
    search,
    searchForAI,
    checkAvailability,
    detectBestProvider,
    loading,
    error,
    lastSearchResult,
    clearError,
    ragService,
    embeddingService
  }
}