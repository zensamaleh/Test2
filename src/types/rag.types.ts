// Types pour l'indexation vectorielle et RAG
export interface Embedding {
  id: string
  gem_id: string
  dataset_id: string
  content: string
  metadata: {
    chunk_index?: number
    source_file?: string
    file_type?: string
    section?: string
    page_number?: number
    line_start?: number
    line_end?: number
    tokens?: number
  }
  embedding: number[]
  created_at: string
}

export interface ChunkData {
  content: string
  metadata: {
    chunk_index: number
    source_file: string
    file_type: string
    section?: string
    page_number?: number
    line_start?: number
    line_end?: number
    tokens: number
  }
}

export interface SimilarityMatch {
  id: string
  content: string
  metadata: any
  similarity: number
}

export interface RAGSearchResult {
  matches: SimilarityMatch[]
  query: string
  threshold: number
  total_matches: number
}

export interface EmbeddingProvider {
  name: string
  model: string
  dimensions: number
  maxTokens: number
  costPer1KTokens: number
}

export const EMBEDDING_PROVIDERS: Record<string, EmbeddingProvider> = {
  'gemini-embedding-004': {
    name: 'Google Gemini',
    model: 'text-embedding-004',
    dimensions: 768,
    maxTokens: 2048,
    costPer1KTokens: 0.00001
  }
}

export interface ChunkingConfig {
  chunkSize: number        // Nombre de caractères par chunk
  chunkOverlap: number     // Chevauchement entre chunks
  respectSentences: boolean // Respecter les phrases
  respectParagraphs: boolean // Respecter les paragraphes
  minChunkSize: number     // Taille minimum d'un chunk
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  respectSentences: true,
  respectParagraphs: true,
  minChunkSize: 100
}

export interface RAGConfig {
  embeddingProvider: keyof typeof EMBEDDING_PROVIDERS
  chunkingConfig: ChunkingConfig
  similarityThreshold: number  // Seuil de similarité (0-1)
  maxMatches: number          // Nombre max de résultats
  includeMetadata: boolean    // Inclure les métadonnées dans la recherche
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  embeddingProvider: 'gemini-embedding-004', // Gemini par défaut (moins cher et performant)
  chunkingConfig: DEFAULT_CHUNKING_CONFIG,
  similarityThreshold: 0.7,
  maxMatches: 5,
  includeMetadata: true
}

// Types pour le chunking spécialisé par format
export interface CSVChunk extends ChunkData {
  metadata: ChunkData['metadata'] & {
    row_start: number
    row_end: number
    columns: string[]
  }
}

export interface PDFChunk extends ChunkData {
  metadata: ChunkData['metadata'] & {
    page_number: number
    page_text_length: number
  }
}

export interface JSONChunk extends ChunkData {
  metadata: ChunkData['metadata'] & {
    json_path: string
    object_type: string
  }
}

// Statistiques d'indexation
export interface IndexingStats {
  total_chunks: number
  total_embeddings: number
  total_tokens: number
  processing_time_ms: number
  cost_estimate: number
  errors: string[]
}

export interface RAGSearchStats {
  query_time_ms: number
  total_embeddings_searched: number
  matches_found: number
  similarity_scores: number[]
}