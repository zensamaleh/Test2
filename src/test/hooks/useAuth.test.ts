import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth'

// Mock Supabase
vi.mock('../../lib/supabase', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
  
  return { supabase: mockSupabase }
})

describe('useAuth', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock console to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: {} }
      })

      const { result } = renderHook(() => useAuth())

      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should handle session retrieval error', async () => {
      const mockError = new Error('Session error')
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: {} }
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('Session error')
      })
    })
  })

  describe('session management', () => {
    beforeEach(() => {
      // Mock successful profile fetch
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          }))
        }))
      })
    })

    it('should load user when session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: {} }
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.session).toEqual(mockSession)
        expect(result.current.error).toBeNull()
      })
    })

    it('should handle missing user profile', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      // Mock profile fetch error
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('User not found')
            })
          }))
        }))
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: {} }
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.user).toBeNull()
        expect(result.current.session).toEqual(mockSession)
      })
    })
  })

  describe('authentication methods', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: {} }
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          }))
        }))
      })
    })

    it('should login successfully', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockSession.user,
          session: mockSession
        },
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const loginResult = await result.current.signIn('test@example.com', 'password')

      expect(loginResult.data).toBeTruthy()
      expect(loginResult.error).toBeNull()
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
    })

    it('should handle login error', async () => {
      const mockError = new Error('Invalid credentials')
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const loginResult = await result.current.signIn('test@example.com', 'wrong-password')

      expect(loginResult.data).toBeNull()
      expect(loginResult.error).toBe('Invalid credentials')
    })

    it('should signup successfully', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockSession.user,
          session: mockSession
        },
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const signupResult = await result.current.signUp('test@example.com', 'password', 'Test User')

      expect(signupResult.data).toBeTruthy()
      expect(signupResult.error).toBeNull()
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      })
    })

    it('should handle signup error', async () => {
      const mockError = new Error('Email already exists')
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const signupResult = await result.current.signUp('test@example.com', 'password', 'Test User')

      expect(signupResult.data).toBeNull()
      expect(signupResult.error).toBe('Email already exists')
    })

    it('should logout successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await result.current.signOut()
      
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle logout error', async () => {
      const mockError = new Error('Logout failed')
      mockSupabase.auth.signOut.mockResolvedValue({
        error: mockError
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await result.current.signOut()

      // Vérifier que l'erreur a été gérée dans l'état
      await waitFor(() => {
        expect(result.current.error).toBe('Logout failed')
      })
    })
  })

  describe('auth state changes', () => {
    it('should set up auth state change listener', () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const mockUnsubscribe = vi.fn()
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } }
      })

      const { unmount } = renderHook(() => useAuth())

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()

      // Cleanup should call unsubscribe
      unmount()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})