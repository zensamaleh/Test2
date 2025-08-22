export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Gem {
  id: string
  name: string
  description: string | null
  prompt: string
  user_id: string
  avatar_url: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  settings?: GemSettings
  datasets?: Dataset[]
  chats?: Chat[]
}

export interface GemSettings {
  model: string
  temperature: number
  maxTokens: number
  responseStyle: 'short' | 'detailed' | 'table' | 'analysis'
  responseFormat: 'text' | 'markdown' | 'json'
  enableCharts: boolean
  enableSimilarity: boolean
}

export interface Dataset {
  id: string
  gem_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  metadata?: any
  processed: boolean
  created_at: string
}

export interface Chat {
  id: string
  gem_id: string
  user_id: string
  session_name: string | null
  messages: Message[]
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: {
    similarItems?: any[]
    charts?: any[]
    processingTime?: number
    model?: string
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
      processingTime?: number
    }
    error?: boolean
    ragContext?: {
      searchResult: {
        matches: Array<{
          id: string
          content: string
          similarity: number
          metadata?: any
        }>
        query: string
        threshold: number
        total_matches: number
      }
      sources: string[]
      contextUsed: boolean
    }
  }
}

export interface SearchResult {
  item: any
  similarity: number
  explanation: string
}

export interface GemTemplate {
  id: string
  name: string
  description: string
  prompt: string
  category: string
  icon: string
}

export const DEFAULT_GEM_SETTINGS: GemSettings = {
  model: 'google/gemini-2.0-flash-exp:free',
  temperature: 0.7,
  maxTokens: 1000,
  responseStyle: 'detailed',
  responseFormat: 'markdown',
  enableCharts: true,
  enableSimilarity: true
}

export const GEM_TEMPLATES: GemTemplate[] = [
  {
    id: 'product-analyzer',
    name: 'Analyseur de Produits',
    description: 'Analyse et compare des produits selon différents critères',
    prompt: 'Tu es un expert en analyse de produits. Analyse les données fournies et aide l\'utilisateur à comprendre les caractéristiques, avantages et comparaisons entre produits. Utilise des tableaux clairs et des recommandations pertinentes.',
    category: 'Commerce',
    icon: '📊'
  },
  {
    id: 'financial-advisor',
    name: 'Conseiller Financier',
    description: 'Analyse des données financières et donne des conseils',
    prompt: 'Tu es un conseiller financier expert. Analyse les données financières fournies et donne des conseils personnalisés. Présente les informations sous forme de graphiques quand possible et explique les tendances importantes.',
    category: 'Finance',
    icon: '💰'
  },
  {
    id: 'content-curator',
    name: 'Curateur de Contenu',
    description: 'Organise et analyse du contenu textuel',
    prompt: 'Tu es un expert en curation de contenu. Analyse les documents fournis, identifie les thèmes principaux, et aide l\'utilisateur à trouver l\'information pertinente. Propose des résumés structurés et des insights.',
    category: 'Contenu',
    icon: '📚'
  },
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    description: 'Analyse approfondie de données avec visualisations',
    prompt: 'Tu es un data scientist expert. Analyse les données de manière approfondie, identifie les patterns, tendances et anomalies. Crée des visualisations pertinentes et explique tes findings avec un langage accessible.',
    category: 'Data Science',
    icon: '🔬'
  }
]