import { 
  ParsedFileData, 
  SupportedFileType, 
  FileValidationResult,
  UPLOAD_CONFIG
} from '../types/dataset.types'

// Service de parsing des fichiers
export class FileParserService {
  
  // Valider un fichier avant parsing
  static validateFile(file: File): FileValidationResult {
    const maxSize = UPLOAD_CONFIG.maxFileSize
    const supportedFormats = UPLOAD_CONFIG.supportedFormats
    
    // Vérifier la taille
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: ${maxSize / 1024 / 1024}MB`
      }
    }
    
    // Déterminer le type de fichier
    const extension = `.${file.name.toLowerCase().split('.').pop()}`
    const mimeType = file.type
    
    let detectedType: SupportedFileType | null = null
    let formatConfig: any = null
    
    for (const [type, config] of Object.entries(supportedFormats) as [SupportedFileType, any][]) {
      if (config.extensions.includes(extension) || config.mimeTypes.includes(mimeType)) {
        detectedType = type as SupportedFileType
        formatConfig = config
        break
      }
    }
    
    if (!detectedType || !formatConfig) {
      return {
        isValid: false,
        error: `Format de fichier non supporté. Formats acceptés: CSV, Excel (.xlsx), JSON, TXT, PDF`
      }
    }
    
    // Vérifier la taille spécifique au format
    if (file.size > formatConfig.maxSize) {
      return {
        isValid: false,
        error: `Le fichier ${detectedType.toUpperCase()} est trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: ${formatConfig.maxSize / 1024 / 1024}MB`
      }
    }
    
    return { isValid: true }
  }
  
  // Parser un fichier selon son type
  static async parseFile(file: File): Promise<ParsedFileData> {
    const validation = this.validateFile(file)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }
    
    const extension = `.${file.name.toLowerCase().split('.').pop()}`
    let type: SupportedFileType
    
    // Déterminer le type
    for (const [formatType, config] of Object.entries(UPLOAD_CONFIG.supportedFormats) as [SupportedFileType, any][]) {
      if (config.extensions.includes(extension)) {
        type = formatType as SupportedFileType
        break
      }
    }
    
    switch (type!) {
      case 'csv':
        return await this.parseCSV(file)
      case 'xlsx':
        return await this.parseExcel(file)
      case 'json':
        return await this.parseJSON(file)
      case 'txt':
        return await this.parseText(file)
      case 'pdf':
        return await this.parsePDF(file)
      default:
        throw new Error('Format de fichier non supporté')
    }
  }
  
  // Parser CSV
  private static async parseCSV(file: File): Promise<ParsedFileData> {
    const text = await file.text()
    const lines = text.split('\\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      throw new Error('Le fichier CSV est vide')
    }
    
    // Détecter le séparateur
    const separators = [',', ';', '\\t']
    let bestSeparator = ','
    let maxColumns = 0
    
    for (const sep of separators) {
      const columns = lines[0].split(sep).length
      if (columns > maxColumns) {
        maxColumns = columns
        bestSeparator = sep
      }
    }
    
    // Parser les données
    const data: any[] = []
    const headers = lines[0].split(bestSeparator).map(h => h.trim().replace(/["\\']/g, ''))
    
    for (let i = 1; i < lines.length && i <= 1000; i++) { // Limite à 1000 lignes pour l'aperçu
      const values = lines[i].split(bestSeparator).map(v => v.trim().replace(/["\\']/g, ''))
      if (values.length === headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        data.push(row)
      }
    }
    
    return {
      type: 'csv',
      data,
      columns: headers,
      metadata: {
        rows: lines.length - 1,
        size: file.size
      },
      preview: data.slice(0, 10)
    }
  }
  
  // Parser Excel (nécessite une bibliothèque externe)
  private static async parseExcel(file: File): Promise<ParsedFileData> {
    try {
      // Utilisation de xlsx (sera installé via bun)
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // Prendre la première feuille
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (data.length === 0) {
        throw new Error('Le fichier Excel est vide')
      }
      
      const headers = data[0] as string[]
      const rows = (data.slice(1) as any[][]).map((row: any[]) => {
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header || `Colonne_${index + 1}`] = row[index] || ''
        })
        return obj
      })
      
      return {
        type: 'xlsx',
        data: rows,
        columns: headers,
        metadata: {
          rows: rows.length,
          size: file.size,
          sheets: workbook.SheetNames
        },
        preview: rows.slice(0, 10)
      }
    } catch (error) {
      throw new Error(`Erreur lors de la lecture du fichier Excel: ${(error as Error).message}`)
    }
  }
  
  // Parser JSON
  private static async parseJSON(file: File): Promise<ParsedFileData> {
    try {
      const text = await file.text()
      const jsonData = JSON.parse(text)
      
      let data: any[] = []
      let columns: string[] = []
      
      if (Array.isArray(jsonData)) {
        data = jsonData
        if (data.length > 0 && typeof data[0] === 'object') {
          columns = Object.keys(data[0])
        }
      } else if (typeof jsonData === 'object') {
        // Si c'est un objet, le traiter comme un seul enregistrement
        data = [jsonData]
        columns = Object.keys(jsonData)
      } else {
        throw new Error('Le fichier JSON doit contenir un array ou un objet')
      }
      
      return {
        type: 'json',
        data,
        columns,
        metadata: {
          rows: data.length,
          size: file.size
        },
        preview: data.slice(0, 10)
      }
    } catch (error) {
      throw new Error(`Erreur lors de la lecture du fichier JSON: ${(error as Error).message}`)
    }
  }
  
  // Parser TXT
  private static async parseText(file: File): Promise<ParsedFileData> {
    const text = await file.text()
    const lines = text.split('\\n').filter(line => line.trim())
    
    // Traiter comme un dataset avec une colonne "contenu"
    const data = lines.map((line, index) => ({
      ligne: index + 1,
      contenu: line.trim()
    }))
    
    return {
      type: 'txt',
      data,
      columns: ['ligne', 'contenu'],
      metadata: {
        rows: lines.length,
        size: file.size,
        encoding: 'UTF-8'
      },
      preview: data.slice(0, 10)
    }
  }
  
  // Parser PDF (nécessite PDF.js ou similaire)
  private static async parsePDF(file: File): Promise<ParsedFileData> {
    try {
      // Utilisation de pdf-parse (sera installé via bun)
      const pdfParse = await import('pdf-parse/lib/pdf-parse.js')
      const arrayBuffer = await file.arrayBuffer()
      const pdfData = await pdfParse.default(Buffer.from(arrayBuffer))
      
      const text = pdfData.text
      const lines = text.split('\\n').filter(line => line.trim())
      
      const data = lines.map((line, index) => ({
        page: Math.floor(index / 50) + 1, // Estimation de page
        ligne: index + 1,
        contenu: line.trim()
      }))
      
      return {
        type: 'pdf',
        data,
        columns: ['page', 'ligne', 'contenu'],
        metadata: {
          rows: lines.length,
          size: file.size
        },
        preview: data.slice(0, 10)
      }
    } catch (error) {
      throw new Error(`Erreur lors de la lecture du fichier PDF: ${(error as Error).message}`)
    }
  }
  
  // Créer un aperçu des données
  static createPreview(data: any[], maxRows: number = 5): any[] {
    return data.slice(0, maxRows)
  }
  
  // Valider les données parsées
  static validateParsedData(data: any[]): { isValid: boolean; issues: string[] } {
    const issues: string[] = []
    
    if (data.length === 0) {
      issues.push('Aucune donnée trouvée dans le fichier')
      return { isValid: false, issues }
    }
    
    if (data.length > 50000) {
      issues.push(`Trop de lignes (${data.length}). Limite recommandée: 50 000`)
    }
    
    // Vérifier la cohérence des colonnes
    if (data.length > 1) {
      const firstRowKeys = Object.keys(data[0]).sort()
      for (let i = 1; i < Math.min(data.length, 10); i++) {
        const currentRowKeys = Object.keys(data[i]).sort()
        if (JSON.stringify(firstRowKeys) !== JSON.stringify(currentRowKeys)) {
          issues.push('Structure de colonnes incohérente détectée')
          break
        }
      }
    }
    
    return { isValid: issues.length === 0, issues }
  }
}