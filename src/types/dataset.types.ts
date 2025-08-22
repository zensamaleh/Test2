// Types pour la gestion des datasets et uploads
export interface Dataset {
  id: string
  gem_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  metadata: {
    rows?: number
    columns?: string[]
    preview?: any[]
    parsed_data?: any[]
    processing_status?: 'pending' | 'processing' | 'completed' | 'error'
    error_message?: string
  }
  processed: boolean
  created_at: string
}

export interface FileUploadData {
  file: File
  type: SupportedFileType
  preview?: any[]
  parsedData?: any[]
}

export type SupportedFileType = 'csv' | 'xlsx' | 'json' | 'txt' | 'pdf'

export interface ParsedFileData {
  type: SupportedFileType
  data: any[]
  columns?: string[]
  metadata?: {
    rows: number
    size: number
    encoding?: string
    sheets?: string[] // Pour Excel
  }
  preview: any[]
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
}

export interface UploadProgress {
  file: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

// Configuration de l'upload
export const UPLOAD_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFilesPerGem: 10,
  supportedFormats: {
    csv: {
      mimeTypes: ['text/csv', 'application/csv', 'text/plain'],
      extensions: ['.csv'],
      maxSize: 25 * 1024 * 1024 // 25MB pour CSV
    },
    xlsx: {
      mimeTypes: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ],
      extensions: ['.xlsx', '.xls'],
      maxSize: 25 * 1024 * 1024 // 25MB pour Excel
    },
    json: {
      mimeTypes: ['application/json', 'text/json'],
      extensions: ['.json'],
      maxSize: 10 * 1024 * 1024 // 10MB pour JSON
    },
    txt: {
      mimeTypes: ['text/plain', 'text/tab-separated-values'],
      extensions: ['.txt', '.tsv'],
      maxSize: 10 * 1024 * 1024 // 10MB pour TXT
    },
    pdf: {
      mimeTypes: ['application/pdf'],
      extensions: ['.pdf'],
      maxSize: 25 * 1024 * 1024 // 25MB pour PDF
    }
  } as const
}

// Utilitaires pour l'upload
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const getFileIcon = (type: SupportedFileType): string => {
  const icons = {
    csv: '📊',
    xlsx: '📗',
    json: '⚙️',
    txt: '📄',
    pdf: '📕'
  }
  return icons[type] || '📄'
}

export const getFileTypeFromName = (fileName: string): SupportedFileType | null => {
  const extension = fileName.toLowerCase().split('.').pop()
  
  for (const [type, config] of Object.entries(UPLOAD_CONFIG.supportedFormats)) {
    if (config.extensions.some(ext => ext === `.${extension}`)) {
      return type as SupportedFileType
    }
  }
  
  return null
}