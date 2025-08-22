import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmbeddingService } from '../../lib/embeddingService'
import type { ChunkData } from '../../types/rag.types'

// Mock global fetch
global.fetch = vi.fn()

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService

  beforeEach(() => {
    // Créer une nouvelle instance pour chaque test
    // Reset singleton instance
    // @ts-ignore - Accès à la propriété privée pour les tests
    EmbeddingService.instance = undefined
    embeddingService = new EmbeddingService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EmbeddingService.getInstance()
      const instance2 = EmbeddingService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('API key management', () => {
    it('should set and get Gemini API key', () => {
      const testKey = 'AIzaSyTest123'
      embeddingService.setGeminiApiKey(testKey)
      
      expect(embeddingService.getGeminiApiKey()).toBe(testKey)
      expect(localStorage.getItem('gemini_api_key')).toBe(testKey)
    })

    it('should return null when no API key is set', () => {
      expect(embeddingService.getGeminiApiKey()).toBeNull()
    })

    it('should load API key from localStorage on construction', () => {
      const testKey = 'AIzaSyTest456'
      localStorage.setItem('gemini_api_key', testKey)
      
      const newService = new EmbeddingService()
      expect(newService.getGeminiApiKey()).toBe(testKey)
    })

    it('should load API key from environment variable', () => {
      vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaSyEnvTest')
      
      const newService = new EmbeddingService()
      expect(newService.getGeminiApiKey()).toBe('AIzaSyEnvTest')
    })
  })

  describe('provider configuration', () => {
    it('should return true when Gemini is configured', () => {
      embeddingService.setGeminiApiKey('AIzaSyTest123')
      expect(embeddingService.isProviderConfigured('gemini-embedding-004')).toBe(true)
    })

    it('should return false when Gemini is not configured', () => {
      expect(embeddingService.isProviderConfigured('gemini-embedding-004')).toBe(false)
    })

    it('should return configuration status correctly', () => {
      expect(embeddingService.isConfigured()).toBe(false)
      
      embeddingService.setGeminiApiKey('AIzaSyTest123')
      expect(embeddingService.isConfigured()).toBe(true)
    })
  })

  describe('generateEmbeddings', () => {
    const mockChunks: ChunkData[] = [
      {
        content: 'Premier chunk de test',
        metadata: {
          tokens: 10,
          source_file: 'test.txt',
          file_type: 'txt',
          page_number: 1,
          chunk_index: 0
        }
      },
      {
        content: 'Deuxième chunk de test',
        metadata: {
          tokens: 12,
          source_file: 'test.txt', 
          file_type: 'txt',
          page_number: 1,
          chunk_index: 1
        }
      }
    ]

    const mockGeminiResponse = {
      embedding: {
        values: new Array(768).fill(0).map((_, i) => i * 0.001)
      }
    }

    beforeEach(() => {
      embeddingService.setGeminiApiKey('AIzaSyTest123')
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGeminiResponse),
      } as Response)
    })

    it('should generate embeddings successfully', async () => {
      const result = await embeddingService.generateEmbeddings(mockChunks)
      
      expect(result.embeddings).toHaveLength(2)
      expect(result.embeddings[0]).toHaveLength(768) // Gemini embedding dimensions
      expect(result.stats.total_chunks).toBe(2)
      expect(result.stats.total_embeddings).toBe(2)
      expect(result.stats.total_tokens).toBe(22) // 10 + 12
      expect(result.stats.processing_time_ms).toBeGreaterThan(0)
      expect(result.stats.errors).toHaveLength(0)
    })

    it('should make correct API calls to Gemini', async () => {
      await embeddingService.generateEmbeddings(mockChunks)
      
      expect(fetch).toHaveBeenCalledTimes(2) // One call per chunk
      
      // Vérifier le premier appel
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('Premier chunk de test')
        })
      )
    })

    it('should throw error when provider is not configured', async () => {
      // @ts-ignore - Reset API key for this test
      embeddingService.geminiApiKey = null
      
      await expect(
        embeddingService.generateEmbeddings(mockChunks)
      ).rejects.toThrow('Clé API Google Gemini non configurée')
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as Response)

      const result = await embeddingService.generateEmbeddings([mockChunks[0]])
      
      expect(result.embeddings).toHaveLength(1)
      expect(result.embeddings[0]).toEqual(new Array(768).fill(0)) // Fallback embedding
      expect(result.stats.errors).toHaveLength(1)
      expect(result.stats.errors[0]).toContain('Erreur batch 1')
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      
      const result = await embeddingService.generateEmbeddings([mockChunks[0]])
      
      expect(result.embeddings).toHaveLength(1)
      expect(result.embeddings[0]).toEqual(new Array(768).fill(0))
      expect(result.stats.errors).toHaveLength(1)
    })

    it('should process large batches correctly', async () => {
      // Créer 150 chunks pour tester le batching (batch size = 100)
      const largeBatch = Array.from({ length: 150 }, (_, i) => ({
        content: `Chunk ${i}`,
        metadata: {
          tokens: 5,
          source_file: 'large-test.txt',
          file_type: 'txt',
          page_number: 1,
          chunk_index: i
        }
      }))

      const result = await embeddingService.generateEmbeddings(largeBatch)
      
      expect(result.embeddings).toHaveLength(150)
      expect(result.stats.total_chunks).toBe(150)
      expect(fetch).toHaveBeenCalledTimes(150)
    })

    it('should use default provider when none specified', async () => {
      const result = await embeddingService.generateEmbeddings(mockChunks)
      
      expect(result).toBeDefined()
      expect(result.embeddings).toHaveLength(2)
    })

    it('should calculate cost estimate correctly', async () => {
      const result = await embeddingService.generateEmbeddings(mockChunks)
      
      // Cost should be based on total tokens and provider pricing
      expect(result.stats.cost_estimate).toBeGreaterThan(0)
      expect(typeof result.stats.cost_estimate).toBe('number')
    })
  })
})