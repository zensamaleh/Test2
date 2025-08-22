import { 
  ChunkData, 
  ChunkingConfig, 
  DEFAULT_CHUNKING_CONFIG 
} from '../types/rag.types'

export class ChunkingService {
  
  // Chunking intelligent basé sur le type de contenu
  static chunkContent(
    content: string, 
    fileType: string, 
    fileName: string,
    config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
  ): ChunkData[] {
    
    switch (fileType.toLowerCase()) {
      case 'csv':
        return this.chunkCSV(content, fileName, config)
      case 'json':
        return this.chunkJSON(content, fileName, config)
      case 'pdf':
        return this.chunkPDF(content, fileName, config)
      case 'txt':
        return this.chunkText(content, fileName, config)
      default:
        return this.chunkText(content, fileName, config)
    }
  }
  
  // Chunking CSV - par lignes avec headers
  private static chunkCSV(
    csvContent: string, 
    fileName: string, 
    config: ChunkingConfig
  ): ChunkData[] {
    const lines = csvContent.split('\n')
    if (lines.length === 0) return []
    
    const headers = lines[0]
    const chunks: ChunkData[] = []
    
    // Estimer combien de lignes par chunk
    const avgLineLength = csvContent.length / lines.length
    const linesPerChunk = Math.max(
      Math.floor(config.chunkSize / avgLineLength),
      5 // Minimum 5 lignes par chunk
    )
    
    for (let i = 1; i < lines.length; i += linesPerChunk) {
      const chunkLines = lines.slice(i, i + linesPerChunk)
      const chunkContent = headers + '\n' + chunkLines.join('\n')
      
      chunks.push({
        content: chunkContent,
        metadata: {
          chunk_index: chunks.length,
          source_file: fileName,
          file_type: 'csv',
          section: `Lignes ${i}-${Math.min(i + linesPerChunk - 1, lines.length - 1)}`,
          line_start: i,
          line_end: Math.min(i + linesPerChunk - 1, lines.length - 1),
          tokens: this.estimateTokens(chunkContent)
        }
      })
    }
    
    return chunks
  }
  
  // Chunking JSON - par objets ou arrays
  private static chunkJSON(
    jsonContent: string, 
    fileName: string, 
    config: ChunkingConfig
  ): ChunkData[] {
    try {
      const data = JSON.parse(jsonContent)
      const chunks: ChunkData[] = []
      
      if (Array.isArray(data)) {
        // Array d'objets - chunker par groupes
        const itemsPerChunk = Math.max(
          Math.floor(config.chunkSize / (jsonContent.length / data.length)),
          1
        )
        
        for (let i = 0; i < data.length; i += itemsPerChunk) {
          const chunkData = data.slice(i, i + itemsPerChunk)
          const chunkContent = JSON.stringify(chunkData, null, 2)
          
          chunks.push({
            content: chunkContent,
            metadata: {
              chunk_index: chunks.length,
              source_file: fileName,
              file_type: 'json',
              section: `Items ${i}-${Math.min(i + itemsPerChunk - 1, data.length - 1)}`,
              tokens: this.estimateTokens(chunkContent)
            }
          })
        }
      } else {
        // Objet unique - chunker par propriétés ou par taille
        const content = JSON.stringify(data, null, 2)
        chunks.push(...this.chunkText(content, fileName, config))
      }
      
      return chunks
    } catch (error) {
      // Si parsing échoue, traiter comme du texte
      return this.chunkText(jsonContent, fileName, config)
    }
  }
  
  // Chunking PDF - par pages et paragraphes
  private static chunkPDF(
    pdfContent: string, 
    fileName: string, 
    config: ChunkingConfig
  ): ChunkData[] {
    // Le contenu PDF est déjà extrait en texte par le parser
    return this.chunkText(pdfContent, fileName, config)
  }
  
  // Chunking texte générique - intelligent avec paragraphes et phrases
  private static chunkText(
    content: string, 
    fileName: string, 
    config: ChunkingConfig
  ): ChunkData[] {
    const chunks: ChunkData[] = []
    let currentChunk = ''
    let chunkStart = 0
    
    // Diviser en paragraphes d'abord
    const paragraphs = content.split(/\n\s*\n/)
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim()
      if (!trimmedParagraph) continue
      
      // Si ajouter ce paragraphe dépasse la taille max
      if (currentChunk.length + trimmedParagraph.length > config.chunkSize && currentChunk.length > 0) {
        // Sauvegarder le chunk actuel
        if (currentChunk.length >= config.minChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: {
              chunk_index: chunks.length,
              source_file: fileName,
              file_type: 'txt',
              section: `Caractères ${chunkStart}-${chunkStart + currentChunk.length}`,
              line_start: this.countLines(content.substring(0, chunkStart)),
              line_end: this.countLines(content.substring(0, chunkStart + currentChunk.length)),
              tokens: this.estimateTokens(currentChunk)
            }
          })
        }
        
        // Commencer un nouveau chunk avec overlap
        const overlapText = this.getOverlap(currentChunk, config.chunkOverlap)
        chunkStart += currentChunk.length - overlapText.length
        currentChunk = overlapText
      }
      
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph
    }
    
    // Ajouter le dernier chunk
    if (currentChunk.trim().length >= config.minChunkSize) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          chunk_index: chunks.length,
          source_file: fileName,
          file_type: 'txt',
          section: `Caractères ${chunkStart}-${chunkStart + currentChunk.length}`,
          line_start: this.countLines(content.substring(0, chunkStart)),
          line_end: this.countLines(content.substring(0, chunkStart + currentChunk.length)),
          tokens: this.estimateTokens(currentChunk)
        }
      })
    }
    
    return chunks
  }
  
  // Utilitaires
  private static estimateTokens(text: string): number {
    // Estimation approximative : 1 token ≈ 4 caractères pour l'anglais/français
    return Math.ceil(text.length / 4)
  }
  
  private static countLines(text: string): number {
    return text.split('\n').length
  }
  
  private static getOverlap(text: string, overlapSize: number): string {
    if (overlapSize >= text.length) return text
    
    // Essayer de couper à une phrase complète
    const lastPart = text.slice(-overlapSize)
    const sentenceEnd = lastPart.search(/[.!?]\s/)
    
    if (sentenceEnd > 0) {
      return lastPart.slice(sentenceEnd + 2)
    }
    
    return lastPart
  }
  
  // Validation d'un chunk
  static validateChunk(chunk: ChunkData): { isValid: boolean; issues: string[] } {
    const issues: string[] = []
    
    if (!chunk.content.trim()) {
      issues.push('Contenu vide')
    }
    
    if (chunk.content.length < 10) {
      issues.push('Contenu trop court (< 10 caractères)')
    }
    
    if (chunk.content.length > 10000) {
      issues.push('Contenu trop long (> 10000 caractères)')
    }
    
    if (chunk.metadata.tokens > 8000) {
      issues.push('Trop de tokens estimés (> 8000)')
    }
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }
  
  // Prévisualiser le chunking
  static previewChunking(
    content: string, 
    fileType: string, 
    fileName: string,
    config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
  ): { 
    total_chunks: number
    estimated_tokens: number
    sample_chunks: ChunkData[]
    config_used: ChunkingConfig
  } {
    const chunks = this.chunkContent(content, fileType, fileName, config)
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.metadata.tokens, 0)
    
    return {
      total_chunks: chunks.length,
      estimated_tokens: totalTokens,
      sample_chunks: chunks.slice(0, 3), // 3 premiers chunks pour aperçu
      config_used: config
    }
  }
}