import { useState, useEffect } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }))
        return
      }
      
      if (session) {
        fetchUserProfile(session.user.id)
          .then(user => {
            setState({ user, session, loading: false, error: null })
          })
          .catch(error => {
            console.error('Error loading user profile:', error)
            setState({ user: null, session, loading: false, error: 'Failed to load user profile' })
          })
      } else {
        setState({ user: null, session: null, loading: false, error: null })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          try {
            const user = await fetchUserProfile(session.user.id)
            setState({ user, session, loading: false, error: null })
          } catch (error) {
            console.error('Error loading user profile on auth change:', error)
            setState({ user: null, session, loading: false, error: 'Failed to load user profile' })
          }
        } else {
          setState({ user: null, session: null, loading: false, error: null })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      throw new Error(`Failed to fetch user profile: ${error.message}`)
    }
    
    return data
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (error) throw error

      // Create user profile
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName || null
        })
      }

      return { data, error: null }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }))
      return { data: null, error: error.message }
    }
  }

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }))
      return { data: null, error: error.message }
    }
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }))
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.user) return

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', state.user.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...updates } : null
      }))
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }))
    }
  }

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    updateProfile
  }
}