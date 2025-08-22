import { useState, useEffect } from 'react'
import { DatasetService } from '../lib/datasetService'
import type { UploadProgress } from '../types/dataset.types'

interface DatasetRow {
  id: string
  gem_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  metadata: any
  processed: boolean
  created_at: string
}

export function useDatasets(gemId?: string) {
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les datasets d'un Gem
  const loadDatasets = async (targetGemId?: string) => {
    const idToUse = targetGemId || gemId
    if (!idToUse) return

    try {
      setLoading(true)
      setError(null)
      const data = await DatasetService.getDatasets(idToUse)
      setDatasets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  // Upload un fichier
  const uploadFile = async (
    targetGemId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ) => {
    try {
      setError(null)
      const dataset = await DatasetService.uploadFile(targetGemId, file, onProgress)
      
      // Recharger la liste
      await loadDatasets(targetGemId)
      
      return dataset
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'upload'
      setError(errorMessage)
      throw err
    }
  }

  // Supprimer un dataset
  const deleteDataset = async (datasetId: string) => {
    try {
      setError(null)
      await DatasetService.deleteDataset(datasetId)
      
      // Retirer de la liste locale
      setDatasets(prev => prev.filter(d => d.id !== datasetId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de suppression'
      setError(errorMessage)
      throw err
    }
  }

  // Obtenir les données combinées
  const getCombinedData = async (targetGemId?: string) => {
    const idToUse = targetGemId || gemId
    if (!idToUse) throw new Error('ID du Gem requis')

    try {
      return await DatasetService.getCombinedData(idToUse)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de récupération des données'
      setError(errorMessage)
      throw err
    }
  }

  // Rechercher dans les données
  const searchInData = async (query: string, targetGemId?: string) => {
    const idToUse = targetGemId || gemId
    if (!idToUse) throw new Error('ID du Gem requis')

    try {
      return await DatasetService.searchInData(idToUse, query)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de recherche'
      setError(errorMessage)
      throw err
    }
  }

  // Obtenir les statistiques
  const getStats = async (targetGemId?: string) => {
    const idToUse = targetGemId || gemId
    if (!idToUse) throw new Error('ID du Gem requis')

    try {
      return await DatasetService.getDatasetStats(idToUse)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de récupération des statistiques'
      setError(errorMessage)
      throw err
    }
  }

  // Charger automatiquement si gemId fourni
  useEffect(() => {
    if (gemId) {
      loadDatasets(gemId)
    }
  }, [gemId])

  return {
    datasets,
    loading,
    error,
    loadDatasets,
    uploadFile,
    deleteDataset,
    getCombinedData,
    searchInData,
    getStats,
    clearError: () => setError(null)
  }
}