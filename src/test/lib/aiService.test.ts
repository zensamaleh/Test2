import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIService } from '../../lib/aiService'
import type { ChatRequest } from '../../types/ai.types'

// Mock global fetch
global.fetch = vi.fn()

describe('AIService', () => {
  let aiService: AIService

  beforeEach(() => {
    aiService = new AIService()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create an instance without errors', () => {
      expect(aiService).toBeInstanceOf(AIService)
    })
  })

  describe('getAvailableModels', () => {
    it('should return available models', () => {
      const models = aiService.getAvailableModels()
      
      expect(models).toBeInstanceOf(Array)
      expect(models.length).toBeGreaterThan(0)
      
      // Vérifier que les modèles Gemini sont présents
      expect(models).toContain('google/gemini-2.0-flash-exp:free')
      expect(models).toContain('deepseek/deepseek-r1-0528:free')
    })

    it('should return string array of model IDs', () => {
      const models = aiService.getAvailableModels()
      
      models.forEach(model => {
        expect(typeof model).toBe('string')
      })
    })
  })

  describe('getModelInfo', () => {
    it('should return model information', () => {
      const modelInfo = aiService.getModelInfo('google/gemini-2.0-flash-exp:free')
      
      expect(modelInfo).toBeDefined()
      expect(modelInfo).toHaveProperty('name')
      expect(modelInfo).toHaveProperty('provider') 
      expect(modelInfo).toHaveProperty('description')
      expect(modelInfo?.name).toBe('Gemini 2.0 Flash')
    })

    it('should return null for unknown model', () => {
      const modelInfo = aiService.getModelInfo('unknown-model')
      expect(modelInfo).toBeNull()
    })
  })

  describe('isModelAvailable', () => {
    it('should return true for available models', () => {
      expect(aiService.isModelAvailable('google/gemini-2.0-flash-exp:free')).toBe(true)
      expect(aiService.isModelAvailable('deepseek/deepseek-r1-0528:free')).toBe(true)
    })

    it('should return false for unavailable models', () => {
      expect(aiService.isModelAvailable('unknown-model')).toBe(false)
    })
  })

  describe('generateResponse', () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'Réponse de test de l\'IA'
        }
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }

    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      // Mock environment variable
      vi.stubEnv('VITE_OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should make a chat request successfully', async () => {
      const request: ChatRequest = {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: 'Bonjour !' }
        ],
        temperature: 0.7,
        maxTokens: 1000
      }

      const response = await aiService.generateResponse(request)

      expect(response.content).toBe('Réponse de test de l\'IA')
      expect(response.usage).toEqual(
        expect.objectContaining({
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
          processingTime: expect.any(Number)
        })
      )
    })

    it('should include system prompt when provided', async () => {
      const request: ChatRequest = {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: 'Bonjour !' }
        ],
        systemPrompt: 'Tu es un assistant utile.',
        temperature: 0.7,
        maxTokens: 1000
      }

      await aiService.generateResponse(request)

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Tu es un assistant utile.')
        })
      )
    })

    it('should use default temperature and maxTokens when not provided', async () => {
      const request: ChatRequest = {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: 'Bonjour !' }
        ]
      }

      await aiService.generateResponse(request)

      const callArgs = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      
      expect(body.temperature).toBe(0.7)
      expect(body.max_tokens).toBe(1000)
    })

    it('should throw error when API key is missing', async () => {
      vi.stubEnv('VITE_OPENROUTER_API_KEY', '')

      const request: ChatRequest = {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: 'Bonjour !' }
        ]
      }

      await expect(aiService.generateResponse(request)).rejects.toThrow(
        'Clé API manquante pour OpenRouter'
      )
    })

    it('should throw error when API response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      } as Response)

      const request: ChatRequest = {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: 'Bonjour !' }
        ]
      }

      await expect(aiService.generateResponse(request)).rejects.toThrow(
        'Clé API invalide ou manquante'
      )
    })

    it('should throw error when response has no choices', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      } as Response)

      const request: ChatRequest = {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: 'Bonjour !' }
        ]
      }

      await expect(aiService.generateResponse(request)).rejects.toThrow(
        'Réponse invalide de l\'API'
      )
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should handle network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const request: ChatRequest = {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: 'Bonjour !' }
        ]
      }

      await expect(aiService.generateResponse(request)).rejects.toThrow()
    })

    it('should handle malformed JSON response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response)

      const request: ChatRequest = {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'user', content: 'Bonjour !' }
        ]
      }

      await expect(aiService.generateResponse(request)).rejects.toThrow()
    })
  })
})