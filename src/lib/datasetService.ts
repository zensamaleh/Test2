import { supabase } from './supabase'
import { FileParserService } from './fileParserService'
import { RAGService } from './ragService'
import { EmbeddingService } from './embeddingService'
import type { 
  FileUploadData, 
  ParsedFileData, 
  UploadProgress,
  SupportedFileType 
} from '../types/dataset.types'
import type { RAGConfig, IndexingStats } from '../types/rag.types'
import { DEFAULT_RAG_CONFIG } from '../types/rag.types'

// Dataset type compatible avec Supabase
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

// Callback pour l'état d'indexation
interface IndexingProgress {
  dataset_id: string
  status: 'starting' | 'chunking' | 'embedding' | 'saving' | 'completed' | 'error'
  progress: number // 0-100
  message?: string
  error?: string
  stats?: IndexingStats
}

export class DatasetService {
  
  // Upload un fichier vers Supabase Storage et créer l'entrée dataset
  static async uploadFile(
    gemId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void,
    autoIndex: boolean = true,
    ragConfig?: RAGConfig,
    onIndexingProgress?: (progress: IndexingProgress) => void
  ): Promise<DatasetRow> {
    
    try {
      // Étape 1: Valider le fichier
      onProgress?.({
        file: file.name,
        progress: 10,
        status: 'uploading'
      })
      
      const validation = FileParserService.validateFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }
      
      // Étape 2: Parser le fichier
      onProgress?.({
        file: file.name,
        progress: 30,
        status: 'processing'
      })
      
      const parsedData = await FileParserService.parseFile(file)
      
      // Étape 3: Upload vers Supabase Storage
      onProgress?.({
        file: file.name,
        progress: 60,
        status: 'uploading'
      })
      
      const fileName = `${gemId}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('datasets')
        .upload(fileName, file)
      
      if (uploadError) {
        throw new Error(`Erreur d'upload: ${uploadError.message}`)
      }
      
      // Étape 4: Créer l'entrée en base de données
      onProgress?.({
        file: file.name,
        progress: 90,
        status: 'processing'
      })
      
      // Vérifier l'authentification avant l'insertion
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Utilisateur non authentifié')
      }
      
      console.log('Tentative d\'insertion du dataset:', {
        gem_id: gemId,
        file_name: file.name,
        user_id: user.id
      })
      
      const { data: dataset, error: dbError } = await supabase
        .from('datasets')
        .insert({
          gem_id: gemId,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: parsedData.type,
          file_size: file.size,
          metadata: {
            rows: parsedData.metadata?.rows || 0,
            columns: parsedData.columns || [],
            preview: parsedData.preview,
            parsed_data: parsedData.data,
            processing_status: 'completed'
          },
          processed: true
        })
        .select()
        .single()
      
      if (dbError) {
        // Nettoyer le fichier uploadé si la DB échoue
        await supabase.storage.from('datasets').remove([uploadData.path])
        throw new Error(`Erreur de base de données: ${dbError.message}`)
      }
      
      onProgress?.({
        file: file.name,
        progress: 100,
        status: 'completed'
      })
      
      // Étape 5: Indexation automatique (si activée)
      if (autoIndex) {
        // Lancer l'indexation en arrière-plan sans bloquer le retour
        this.indexDatasetInBackground(dataset, parsedData, ragConfig, onIndexingProgress)
      }
      
      return dataset
      
    } catch (error) {
      onProgress?.({
        file: file.name,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      })
      throw error
    }
  }
  
  // Récupérer tous les datasets d'un Gem
  static async getDatasets(gemId: string): Promise<DatasetRow[]> {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('gem_id', gemId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Erreur lors de la récupération des datasets: ${error.message}`)
    }
    
    return data || []
  }
  
  // Supprimer un dataset
  static async deleteDataset(datasetId: string): Promise<void> {
    // D'abord récupérer le dataset pour connaître le chemin du fichier
    const { data: dataset, error: fetchError } = await supabase
      .from('datasets')
      .select('file_path')
      .eq('id', datasetId)
      .single()
    
    if (fetchError) {
      throw new Error(`Erreur lors de la récupération du dataset: ${fetchError.message}`)
    }
    
    // Supprimer les embeddings associés
    try {
      const ragService = RAGService.getInstance()
      await ragService.removeDatasetEmbeddings(datasetId)
    } catch (error) {
      console.warn('Erreur lors de la suppression des embeddings:', error)
    }
    
    // Supprimer le fichier du storage
    const { error: storageError } = await supabase.storage
      .from('datasets')
      .remove([dataset.file_path])
    
    if (storageError) {
      console.warn('Erreur lors de la suppression du fichier:', storageError.message)
    }
    
    // Supprimer l'entrée de la DB
    const { error: dbError } = await supabase
      .from('datasets')
      .delete()
      .eq('id', datasetId)
    
    if (dbError) {
      throw new Error(`Erreur lors de la suppression du dataset: ${dbError.message}`)
    }
  }
  
  // Récupérer un dataset spécifique avec ses données
  static async getDataset(datasetId: string): Promise<DatasetRow | null> {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') { // Pas trouvé
        return null
      }
      throw new Error(`Erreur lors de la récupération du dataset: ${error.message}`)
    }
    
    return data
  }
  
  // Obtenir les données combinées de tous les datasets d'un Gem
  static async getCombinedData(gemId: string): Promise<any[]> {
    const datasets = await this.getDatasets(gemId)
    
    let combinedData: any[] = []
    
    for (const dataset of datasets) {
      if (dataset.metadata?.parsed_data) {
        // Ajouter une métadonnée de source à chaque ligne
        const sourceData = dataset.metadata.parsed_data.map((row: any) => ({
          ...row,
          _source: dataset.file_name,
          _dataset_id: dataset.id
        }))
        combinedData = [...combinedData, ...sourceData]
      }
    }
    
    return combinedData
  }
  
  // Rechercher dans les données des datasets
  static async searchInData(gemId: string, query: string): Promise<any[]> {
    const combinedData = await this.getCombinedData(gemId)
    
    const searchTerms = query.toLowerCase().split(' ')
    
    return combinedData.filter(row => {
      const rowString = JSON.stringify(row).toLowerCase()
      return searchTerms.some(term => rowString.includes(term))
    })
  }
  
  // Obtenir les statistiques des datasets d'un Gem
  static async getDatasetStats(gemId: string): Promise<{
    totalDatasets: number
    totalRows: number
    totalSize: number
    fileTypes: Record<string, number>
  }> {
    const datasets = await this.getDatasets(gemId)
    
    const stats = {
      totalDatasets: datasets.length,
      totalRows: 0,
      totalSize: 0,
      fileTypes: {} as Record<string, number>
    }
    
    for (const dataset of datasets) {
      stats.totalRows += dataset.metadata?.rows || 0
      stats.totalSize += dataset.file_size
      
      const fileType = dataset.file_type
      stats.fileTypes[fileType] = (stats.fileTypes[fileType] || 0) + 1
    }
    
    return stats
  }
  
  // Indexer un dataset en arrière-plan
  private static async indexDatasetInBackground(
    dataset: DatasetRow,
    parsedData: ParsedFileData,
    ragConfig: RAGConfig = DEFAULT_RAG_CONFIG,
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`🚀 Démarrage de l'indexation en arrière-plan pour ${dataset.file_name}`)
      
      onProgress?.({
        dataset_id: dataset.id,
        status: 'starting',
        progress: 0,
        message: 'Initialisation de l\'indexation...'
      })
      
      // Vérifier que l'embedding service est configuré
      const embeddingService = EmbeddingService.getInstance()
      if (!embeddingService.isConfigured()) {
        throw new Error('Service d\'embeddings non configuré (clé API OpenAI manquante)')
      }
      
      onProgress?.({
        dataset_id: dataset.id,
        status: 'chunking',
        progress: 20,
        message: 'Découpage du contenu...'
      })
      
      // Convertir les données parsées en texte pour l'indexation
      const contentText = this.convertDataToText(parsedData)
      
      onProgress?.({
        dataset_id: dataset.id,
        status: 'embedding',
        progress: 40,
        message: 'Génération des embeddings...'
      })
      
      // Lancer l'indexation
      const ragService = RAGService.getInstance()
      const stats = await ragService.indexDataset(
        dataset.gem_id,
        dataset.id,
        contentText,
        dataset.file_name,
        dataset.file_type,
        ragConfig
      )
      
      onProgress?.({
        dataset_id: dataset.id,
        status: 'completed',
        progress: 100,
        message: `Indexation terminée en ${Date.now() - startTime}ms`,
        stats
      })
      
      console.log(`✅ Indexation terminée pour ${dataset.file_name}:`, stats)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      
      onProgress?.({
        dataset_id: dataset.id,
        status: 'error',
        progress: 0,
        error: errorMessage
      })
      
      console.error(`❌ Erreur indexation ${dataset.file_name}:`, error)
    }
  }
  
  // Indexer manuellement un dataset existant
  static async indexDataset(
    datasetId: string,
    ragConfig: RAGConfig = DEFAULT_RAG_CONFIG,
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<IndexingStats> {
    // Récupérer le dataset
    const dataset = await this.getDataset(datasetId)
    if (!dataset) {
      throw new Error('Dataset introuvable')
    }
    
    // Convertir les métadonnées en ParsedFileData
    const parsedData: ParsedFileData = {
      type: dataset.file_type as SupportedFileType,
      data: dataset.metadata?.parsed_data || [],
      columns: dataset.metadata?.columns || [],
      preview: dataset.metadata?.preview || [],
      metadata: {
        rows: dataset.metadata?.rows || 0,
        size: dataset.file_size
      }
    }
    
    // Lancer l'indexation et retourner les stats
    return new Promise((resolve, reject) => {
      let finalStats: IndexingStats | null = null
      
      this.indexDatasetInBackground(
        dataset,
        parsedData,
        ragConfig,
        (progress) => {
          onProgress?.(progress)
          if (progress.status === 'completed' && progress.stats) {
            finalStats = progress.stats
            resolve(finalStats)
          } else if (progress.status === 'error') {
            reject(new Error(progress.error))
          }
        }
      ).catch(reject)
    })
  }
  
  // Réindexer un dataset (supprimer + recréer les embeddings)
  static async reindexDataset(
    datasetId: string,
    ragConfig: RAGConfig = DEFAULT_RAG_CONFIG,
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<IndexingStats> {
    onProgress?.({
      dataset_id: datasetId,
      status: 'starting',
      progress: 0,
      message: 'Suppression des anciens embeddings...'
    })
    
    // Supprimer les anciens embeddings
    const ragService = RAGService.getInstance()
    await ragService.removeDatasetEmbeddings(datasetId)
    
    // Relancer l'indexation
    return this.indexDataset(datasetId, ragConfig, onProgress)
  }
  
  // Vérifier si un dataset a des embeddings
  static async hasEmbeddings(datasetId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('dataset_id', datasetId)
      
      if (error) {
        console.error('Erreur vérification embeddings:', error)
        return false
      }
      
      return (count || 0) > 0
    } catch (error) {
      console.error('Erreur vérification embeddings:', error)
      return false
    }
  }
  
  // Obtenir les statistiques d'indexation d'un dataset
  static async getIndexingStats(datasetId: string): Promise<{
    hasEmbeddings: boolean
    embeddingsCount: number
    lastIndexed?: string
  }> {
    try {
      const { data: embeddings, error } = await supabase
        .from('embeddings')
        .select('id, created_at')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Erreur récupération stats: ${error.message}`)
      }
      
      return {
        hasEmbeddings: embeddings.length > 0,
        embeddingsCount: embeddings.length,
        lastIndexed: embeddings[0]?.created_at
      }
    } catch (error) {
      console.error('Erreur stats indexation:', error)
      return {
        hasEmbeddings: false,
        embeddingsCount: 0
      }
    }
  }
  
  // Prévisualiser l'indexation d'un dataset
  static async previewIndexing(
    datasetId: string,
    ragConfig: RAGConfig = DEFAULT_RAG_CONFIG
  ) {
    const dataset = await this.getDataset(datasetId)
    if (!dataset) {
      throw new Error('Dataset introuvable')
    }
    
    const parsedData: ParsedFileData = {
      type: dataset.file_type as SupportedFileType,
      data: dataset.metadata?.parsed_data || [],
      columns: dataset.metadata?.columns || [],
      preview: dataset.metadata?.preview || [],
      metadata: {
        rows: dataset.metadata?.rows || 0,
        size: dataset.file_size
      }
    }
    
    const contentText = this.convertDataToText(parsedData)
    
    const ragService = RAGService.getInstance()
    return ragService.previewIndexing(
      contentText,
      dataset.file_name,
      dataset.file_type,
      ragConfig
    )
  }
  
  // Convertir les données parsées en texte pour l'indexation
  private static convertDataToText(parsedData: ParsedFileData): string {
    if (!parsedData.data || parsedData.data.length === 0) {
      return ''
    }
    
    switch (parsedData.type) {
      case 'csv':
      case 'xlsx':
        // Convertir le CSV/Excel en texte structuré
        const headers = parsedData.columns?.join(' | ') || ''
        const rows = parsedData.data.map((row: any) => {
          return Object.values(row).join(' | ')
        }).join('\n')
        return headers + '\n' + rows
        
      case 'json':
        // Convertir le JSON en texte formaté
        return JSON.stringify(parsedData.data, null, 2)
        
      case 'txt':
      case 'pdf':
        // Le texte est déjà dans le bon format
        if (Array.isArray(parsedData.data)) {
          return parsedData.data.join('\n')
        }
        return String(parsedData.data)
        
      default:
        return JSON.stringify(parsedData.data)
    }
  }
}