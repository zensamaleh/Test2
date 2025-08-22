import { 
  Embedding,
  ChunkData, 
  SimilarityMatch,
  RAGSearchResult,
  RAGConfig,
  DEFAULT_RAG_CONFIG,
  IndexingStats,
  RAGSearchStats
} from '../types/rag.types'
import { supabase } from './supabase'
import { ChunkingService } from './chunkingService'
import { EmbeddingService } from './embeddingService'

export class RAGService {
  private static instance: RAGService
  private embeddingService: EmbeddingService

  constructor() {
    this.embeddingService = EmbeddingService.getInstance()
  }

  static getInstance(): RAGService {
    if (!this.instance) {
      this.instance = new RAGService()
    }
    return this.instance
  }

  // Indexer un dataset complet
  async indexDataset(
    gemId: string,
    datasetId: string,
    content: string,
    fileName: string,
    fileType: string,
    config: RAGConfig = DEFAULT_RAG_CONFIG
  ): Promise<IndexingStats> {
    console.log(`🔍 Indexation du dataset ${datasetId} pour le gem ${gemId}`)

    try {
      // 1. Chunker le contenu
      const chunks = ChunkingService.chunkContent(content, fileType, fileName, config.chunkingConfig)
      console.log(`📝 ${chunks.length} chunks créés`)

      if (chunks.length === 0) {
        throw new Error('Aucun chunk généré à partir du contenu')
      }

      // 2. Générer les embeddings
      const { embeddings, stats } = await this.embeddingService.generateEmbeddings(
        chunks, 
        config.embeddingProvider
      )

      if (embeddings.length !== chunks.length) {
        throw new Error(`Nombre d'embeddings (${embeddings.length}) != nombre de chunks (${chunks.length})`)
      }

      // 3. Sauvegarder dans Supabase Vector
      const embeddingRecords = chunks.map((chunk, index) => ({
        gem_id: gemId,
        dataset_id: datasetId,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: embeddings[index]
      }))

      // Insérer par batches pour éviter les limites
      const batchSize = 50
      let insertedCount = 0
      
      for (let i = 0; i < embeddingRecords.length; i += batchSize) {
        const batch = embeddingRecords.slice(i, i + batchSize)
        
        const { data, error } = await supabase
          .from('embeddings')
          .insert(batch)
          .select('id')

        if (error) {
          console.error('Erreur insertion batch:', error)
          stats.errors.push(`Erreur insertion batch ${Math.floor(i/batchSize) + 1}: ${error.message}`)
        } else {
          insertedCount += batch.length
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(embeddingRecords.length/batchSize)} inséré`)
        }
      }

      console.log(`💾 ${insertedCount} embeddings sauvegardés sur ${chunks.length}`)

      return {
        ...stats,
        total_embeddings: insertedCount
      }

    } catch (error) {
      console.error('Erreur indexation dataset:', error)
      throw error
    }
  }

  // Rechercher des contenus similaires
  async searchSimilar(
    gemId: string,
    query: string,
    config: RAGConfig = DEFAULT_RAG_CONFIG
  ): Promise<RAGSearchResult> {
    const startTime = Date.now()
    
    try {
      console.log(`🔎 Recherche RAG pour: "${query}" dans le gem ${gemId}`)

      // 1. Générer l'embedding de la requête
      const queryEmbedding = await this.embeddingService.generateSingleEmbedding(
        query, 
        config.embeddingProvider
      )

      // 2. Rechercher dans Supabase Vector
      const { data: matches, error } = await supabase.rpc('match_embeddings', {
        query_embedding: queryEmbedding,
        match_gem_id: gemId,
        match_threshold: config.similarityThreshold,
        match_count: config.maxMatches
      })

      if (error) {
        console.error('Erreur recherche similarité:', error)
        throw new Error(`Erreur recherche: ${error.message}`)
      }

      // 3. Formater les résultats
      const similarityMatches: SimilarityMatch[] = (matches || []).map((match: any) => ({
        id: match.id,
        content: match.content,
        metadata: match.metadata,
        similarity: match.similarity
      }))

      const searchTime = Date.now() - startTime
      console.log(`✅ ${similarityMatches.length} résultats trouvés en ${searchTime}ms`)

      return {
        matches: similarityMatches,
        query,
        threshold: config.similarityThreshold,
        total_matches: similarityMatches.length
      }

    } catch (error) {
      console.error('Erreur recherche RAG:', error)
      throw error
    }
  }

  // Supprimer tous les embeddings d'un dataset
  async removeDatasetEmbeddings(datasetId: string): Promise<{ deleted_count: number }> {
    try {
      const { data, error } = await supabase
        .from('embeddings')
        .delete()
        .eq('dataset_id', datasetId)
        .select('id')

      if (error) {
        throw new Error(`Erreur suppression embeddings: ${error.message}`)
      }

      const deletedCount = data?.length || 0
      console.log(`🗑️ ${deletedCount} embeddings supprimés pour le dataset ${datasetId}`)

      return { deleted_count: deletedCount }
    } catch (error) {
      console.error('Erreur suppression embeddings:', error)
      throw error
    }
  }

  // Supprimer tous les embeddings d'un gem
  async removeGemEmbeddings(gemId: string): Promise<{ deleted_count: number }> {
    try {
      const { data, error } = await supabase
        .from('embeddings')
        .delete()
        .eq('gem_id', gemId)
        .select('id')

      if (error) {
        throw new Error(`Erreur suppression embeddings: ${error.message}`)
      }

      const deletedCount = data?.length || 0
      console.log(`🗑️ ${deletedCount} embeddings supprimés pour le gem ${gemId}`)

      return { deleted_count: deletedCount }
    } catch (error) {
      console.error('Erreur suppression embeddings:', error)
      throw error
    }
  }

  // Obtenir les statistiques d'un gem
  async getGemStats(gemId: string): Promise<{
    total_embeddings: number
    datasets: { dataset_id: string; count: number; last_indexed: string }[]
    total_content_size: number
  }> {
    try {
      // Compter le total d'embeddings
      const { count: totalEmbeddings, error: countError } = await supabase
        .from('embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('gem_id', gemId)

      if (countError) {
        throw new Error(`Erreur comptage: ${countError.message}`)
      }

      // Statistiques par dataset
      const { data: datasetStats, error: statsError } = await supabase
        .from('embeddings')
        .select('dataset_id, content, created_at')
        .eq('gem_id', gemId)

      if (statsError) {
        throw new Error(`Erreur stats: ${statsError.message}`)
      }

      // Grouper par dataset
      const datasetsMap = new Map<string, { count: number; last_indexed: string; content_size: number }>()
      let totalContentSize = 0

      datasetStats?.forEach(row => {
        const existing = datasetsMap.get(row.dataset_id) || { 
          count: 0, 
          last_indexed: row.created_at,
          content_size: 0
        }
        
        existing.count++
        existing.content_size += row.content.length
        totalContentSize += row.content.length
        
        if (row.created_at > existing.last_indexed) {
          existing.last_indexed = row.created_at
        }
        
        datasetsMap.set(row.dataset_id, existing)
      })

      const datasets = Array.from(datasetsMap.entries()).map(([dataset_id, stats]) => ({
        dataset_id,
        count: stats.count,
        last_indexed: stats.last_indexed
      }))

      return {
        total_embeddings: totalEmbeddings || 0,
        datasets,
        total_content_size: totalContentSize
      }

    } catch (error) {
      console.error('Erreur récupération stats:', error)
      throw error
    }
  }

  // Réindexer un dataset (supprimer + recréer)
  async reindexDataset(
    gemId: string,
    datasetId: string,
    content: string,
    fileName: string,
    fileType: string,
    config: RAGConfig = DEFAULT_RAG_CONFIG
  ): Promise<IndexingStats> {
    console.log(`🔄 Réindexation du dataset ${datasetId}`)

    try {
      // 1. Supprimer les anciens embeddings
      await this.removeDatasetEmbeddings(datasetId)

      // 2. Créer les nouveaux embeddings
      return await this.indexDataset(gemId, datasetId, content, fileName, fileType, config)
      
    } catch (error) {
      console.error('Erreur réindexation:', error)
      throw error
    }
  }

  // Recherche avec contexte enrichi pour l'IA
  async searchForAI(
    gemId: string,
    query: string,
    config: RAGConfig = DEFAULT_RAG_CONFIG
  ): Promise<{
    context: string
    sources: string[]
    searchResult: RAGSearchResult
    stats: RAGSearchStats
  }> {
    const startTime = Date.now()
    
    try {
      const searchResult = await this.searchSimilar(gemId, query, config)
      
      // Construire le contexte pour l'IA
      const context = searchResult.matches
        .map((match, index) => 
          `[Source ${index + 1}] ${match.content}`
        )
        .join('\n\n')

      // Extraire les sources
      const sources = searchResult.matches
        .map((match, index) => {
          const sourceFile = match.metadata?.source_file || 'Fichier inconnu'
          const section = match.metadata?.section || ''
          return `Source ${index + 1}: ${sourceFile}${section ? ` (${section})` : ''}`
        })

      const searchTime = Date.now() - startTime

      const stats: RAGSearchStats = {
        query_time_ms: searchTime,
        total_embeddings_searched: searchResult.total_matches,
        matches_found: searchResult.matches.length,
        similarity_scores: searchResult.matches.map(m => m.similarity)
      }

      console.log(`🤖 Contexte RAG préparé: ${context.length} caractères, ${sources.length} sources`)

      return {
        context,
        sources,
        searchResult,
        stats
      }

    } catch (error) {
      console.error('Erreur recherche pour IA:', error)
      throw error
    }
  }

  // Vérifier si un gem a des embeddings
  async hasEmbeddings(gemId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('gem_id', gemId)

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

  // Prévisualiser l'indexation
  async previewIndexing(
    content: string,
    fileName: string,
    fileType: string,
    config: RAGConfig = DEFAULT_RAG_CONFIG
  ): Promise<{
    chunks_preview: ChunkData[]
    total_chunks: number
    estimated_cost: number
    estimated_tokens: number
    processing_time_estimate: string
  }> {
    const chunks = ChunkingService.chunkContent(content, fileType, fileName, config.chunkingConfig)
    const costEstimate = EmbeddingService.estimateCost(chunks, config.embeddingProvider)
    
    // Estimation du temps de traitement (basée sur l'expérience)
    const estimatedSeconds = Math.ceil(chunks.length / 50) * 2 // ~2 sec par batch de 50
    const processingTimeEstimate = estimatedSeconds < 60 
      ? `${estimatedSeconds} secondes`
      : `${Math.ceil(estimatedSeconds / 60)} minutes`

    return {
      chunks_preview: chunks.slice(0, 3),
      total_chunks: chunks.length,
      estimated_cost: costEstimate.costEstimate,
      estimated_tokens: costEstimate.totalTokens,
      processing_time_estimate: processingTimeEstimate
    }
  }
}

export default RAGService