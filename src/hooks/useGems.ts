import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Gem, Dataset, Chat, GemSettings } from '../types'
import { DEFAULT_GEM_SETTINGS } from '../types'
import { v4 as uuidv4 } from 'uuid'
import type { Json } from '../types/database.types'

// Fonction utilitaire pour transformer les données DB en Gem
const transformGemFromDB = (dbGem: any): Gem => ({
  ...dbGem,
  settings: dbGem.settings ? dbGem.settings as GemSettings : DEFAULT_GEM_SETTINGS
})

export function useGems(userId?: string) {
  const [gems, setGems] = useState<Gem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchGems()
    }
  }, [userId])

  const fetchGems = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gems')
        .select(`
          *,
          datasets:datasets(*),
          chats:chats(*)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setGems((data || []).map(transformGemFromDB))
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const createGem = async (gemData: {
    name: string
    description?: string
    prompt: string
    settings?: Partial<GemSettings>
    is_public?: boolean
  }) => {
    if (!userId) throw new Error('User not authenticated')

    try {
      const settings = { ...DEFAULT_GEM_SETTINGS, ...gemData.settings }
      const newGem = {
        id: uuidv4(),
        name: gemData.name,
        description: gemData.description || null,
        prompt: gemData.prompt,
        user_id: userId,
        is_public: gemData.is_public || false,
        settings: settings as Json
      }

      const { data, error } = await supabase
        .from('gems')
        .insert(newGem)
        .select()
        .single()

      if (error) throw error

      setGems(prev => [transformGemFromDB(data), ...prev])
      return transformGemFromDB(data)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const updateGem = async (gemId: string, updates: Partial<Gem>) => {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      // Convert settings to Json if present
      if (updates.settings) {
        updateData.settings = JSON.parse(JSON.stringify(updates.settings)) as Json
      }

      const { data, error } = await supabase
        .from('gems')
        .update(updateData)
        .eq('id', gemId)
        .select()
        .single()

      if (error) throw error

      const transformedGem = transformGemFromDB(data)
      setGems(prev => 
        prev.map(gem => gem.id === gemId ? { ...gem, ...transformedGem } : gem)
      )
      return transformedGem
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const deleteGem = async (gemId: string) => {
    try {
      // Delete associated datasets and chats first
      await supabase.from('datasets').delete().eq('gem_id', gemId)
      await supabase.from('chats').delete().eq('gem_id', gemId)
      
      const { error } = await supabase
        .from('gems')
        .delete()
        .eq('id', gemId)

      if (error) throw error

      setGems(prev => prev.filter(gem => gem.id !== gemId))
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const getGem = async (gemId: string): Promise<Gem | null> => {
    try {
      const { data, error } = await supabase
        .from('gems')
        .select(`
          *,
          datasets:datasets(*),
          chats:chats(*)
        `)
        .eq('id', gemId)
        .single()

      if (error) throw error
      return transformGemFromDB(data)
    } catch (error: any) {
      setError(error.message)
      return null
    }
  }

  const fetchPublicGems = async (): Promise<Gem[]> => {
    try {
      const { data, error } = await supabase
        .from('gems')
        .select(`
          *,
          users:users(full_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return (data || []).map(transformGemFromDB)
    } catch (error: any) {
      setError(error.message)
      return []
    }
  }

  const cloneGem = async (originalGemId: string, newName?: string) => {
    if (!userId) throw new Error('User not authenticated')

    try {
      const originalGem = await getGem(originalGemId)
      if (!originalGem) throw new Error('Gem not found')

      const clonedGem = await createGem({
        name: newName || `${originalGem.name} (Clone)`,
        description: originalGem.description || undefined,
        prompt: originalGem.prompt,
        settings: originalGem.settings,
        is_public: false
      })

      return clonedGem
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  return {
    gems,
    loading,
    error,
    fetchGems,
    createGem,
    updateGem,
    deleteGem,
    getGem,
    fetchPublicGems,
    cloneGem
  }
}