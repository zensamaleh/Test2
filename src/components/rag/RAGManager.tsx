import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { Slider } from '../ui/slider'
import { Switch } from '../ui/switch'
import { Alert, AlertDescription } from '../ui/alert'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { 
  Settings, 
  Database, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Eye,
  BarChart3,
  Key,
  Zap
} from 'lucide-react'

import { EmbeddingService } from '../../lib/embeddingService'
import { RAGService } from '../../lib/ragService'
import { DatasetService } from '../../lib/datasetService'
import type { 
  RAGConfig, 
  IndexingStats,
  RAGSearchResult 
} from '../../types/rag.types'
import { DEFAULT_RAG_CONFIG, EMBEDDING_PROVIDERS } from '../../types/rag.types'
import type { Gem } from '../../types'

interface RAGManagerProps {
  gem: Gem
  onIndexingUpdate?: (stats: IndexingStats) => void
}

interface DatasetIndexingState {
  id: string
  name: string
  hasEmbeddings: boolean
  isIndexing: boolean
  lastIndexed?: string
  embeddingsCount?: number
}

export default function RAGManager({ gem, onIndexingUpdate }: RAGManagerProps) {
  const [embeddingService] = useState(() => EmbeddingService.getInstance())
  const [ragService] = useState(() => RAGService.getInstance())
  
  // État de configuration
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string; provider?: string } | null>(null)
  
  // Configuration RAG
  const [ragConfig, setRagConfig] = useState<RAGConfig>(DEFAULT_RAG_CONFIG)
  
  // État des datasets
  const [datasets, setDatasets] = useState<DatasetIndexingState[]>([])
  const [loadingDatasets, setLoadingDatasets] = useState(true)
  
  // Recherche de test
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<RAGSearchResult | null>(null)
  const [searchingRag, setSearchingRag] = useState(false)
  
  // Statistiques globales
  const [gemStats, setGemStats] = useState<{
    total_embeddings: number
    datasets: { dataset_id: string; count: number; last_indexed: string }[]
    total_content_size: number
  } | null>(null)

  // Initialisation
  useEffect(() => {
    initializeRAG()
  }, [gem.id])

  const initializeRAG = async () => {
    // Vérifier la configuration
    setOpenaiApiKey('') // OpenAI désactivé
    setGeminiApiKey(embeddingService.getGeminiApiKey() || '')
    setIsConfigured(embeddingService.isConfigured())
    
    // Charger les datasets
    await loadDatasets()
    
    // Charger les statistiques
    await loadGemStats()
  }

  const loadDatasets = async () => {
    setLoadingDatasets(true)
    try {
      const datasetsData = await DatasetService.getDatasets(gem.id)
      const datasetsState: DatasetIndexingState[] = []
      
      for (const dataset of datasetsData) {
        const indexingStats = await DatasetService.getIndexingStats(dataset.id)
        datasetsState.push({
          id: dataset.id,
          name: dataset.file_name,
          hasEmbeddings: indexingStats.hasEmbeddings,
          isIndexing: false,
          lastIndexed: indexingStats.lastIndexed,
          embeddingsCount: indexingStats.embeddingsCount
        })
      }
      
      setDatasets(datasetsState)
    } catch (error) {
      console.error('Erreur chargement datasets:', error)
    } finally {
      setLoadingDatasets(false)
    }
  }

  const loadGemStats = async () => {
    try {
      const stats = await ragService.getGemStats(gem.id)
      setGemStats(stats)
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    }
  }

  const handleOpenAIApiKeyChange = (newApiKey: string) => {
    // OpenAI désactivé - utilisation de Gemini uniquement
    setOpenaiApiKey(newApiKey)
    // embeddingService.setOpenAIApiKey(newApiKey) // Désactivé
    setIsConfigured(embeddingService.isConfigured())
    setConnectionStatus(null)
  }

  const handleGeminiApiKeyChange = (newApiKey: string) => {
    setGeminiApiKey(newApiKey)
    embeddingService.setGeminiApiKey(newApiKey)
    setIsConfigured(embeddingService.isConfigured())
    setConnectionStatus(null)
  }

  const testConnection = async (providerKey?: keyof typeof EMBEDDING_PROVIDERS) => {
    setTestingConnection(true)
    try {
      const result = await embeddingService.testConnection(providerKey)
      setConnectionStatus(result)
    } catch (error) {
      setConnectionStatus({ success: false, message: 'Erreur de test de connexion' })
    } finally {
      setTestingConnection(false)
    }
  }

  const indexDataset = async (datasetId: string) => {
    // Marquer comme en cours d'indexation
    setDatasets(prev => prev.map(ds => 
      ds.id === datasetId ? { ...ds, isIndexing: true } : ds
    ))

    try {
      const stats = await DatasetService.indexDataset(datasetId, ragConfig, (progress) => {
        console.log('Progrès indexation:', progress)
        if (progress.status === 'completed' && progress.stats) {
          onIndexingUpdate?.(progress.stats)
        }
      })
      
      console.log('Indexation terminée:', stats)
      await loadDatasets()
      await loadGemStats()
      
    } catch (error) {
      console.error('Erreur indexation:', error)
    } finally {
      // Retirer l'état d'indexation
      setDatasets(prev => prev.map(ds => 
        ds.id === datasetId ? { ...ds, isIndexing: false } : ds
      ))
    }
  }

  const reindexDataset = async (datasetId: string) => {
    setDatasets(prev => prev.map(ds => 
      ds.id === datasetId ? { ...ds, isIndexing: true } : ds
    ))

    try {
      const stats = await DatasetService.reindexDataset(datasetId, ragConfig, (progress) => {
        console.log('Progrès réindexation:', progress)
      })
      
      console.log('Réindexation terminée:', stats)
      await loadDatasets()
      await loadGemStats()
      
    } catch (error) {
      console.error('Erreur réindexation:', error)
    } finally {
      setDatasets(prev => prev.map(ds => 
        ds.id === datasetId ? { ...ds, isIndexing: false } : ds
      ))
    }
  }

  const testRAGSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearchingRag(true)
    try {
      const result = await ragService.searchSimilar(gem.id, searchQuery, ragConfig)
      setSearchResult(result)
    } catch (error) {
      console.error('Erreur recherche RAG:', error)
      setSearchResult(null)
    } finally {
      setSearchingRag(false)
    }
  }

  const previewIndexing = async (datasetId: string) => {
    try {
      const preview = await DatasetService.previewIndexing(datasetId, ragConfig)
      alert(`Prévisualisation:\n${preview.total_chunks} chunks\n${preview.estimated_tokens} tokens\nCoût estimé: $${preview.estimated_cost.toFixed(4)}\nTemps estimé: ${preview.processing_time_estimate}`)
    } catch (error) {
      console.error('Erreur prévisualisation:', error)
      alert('Erreur lors de la prévisualisation')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Gestion RAG - {gem.name}</h3>
            {isConfigured && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configuré
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="config">
                <Key className="h-4 w-4 mr-2" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="datasets">
                <Database className="h-4 w-4 mr-2" />
                Datasets
              </TabsTrigger>
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Test Recherche
              </TabsTrigger>
              <TabsTrigger value="stats">
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistiques
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <div className="space-y-6">
                {/* OpenAI Configuration */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    OpenAI API
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="openai-key">Clé API OpenAI</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="openai-key"
                          type="password"
                          placeholder="sk-..."
                          value={openaiApiKey}
                          onChange={(e) => handleOpenAIApiKeyChange(e.target.value)}
                        />
                        <Button
                          onClick={() => testConnection('openai-3-small')}
                          disabled={!openaiApiKey || testingConnection}
                          size="sm"
                        >
                          {testingConnection ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Tester'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gemini Configuration */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Google Gemini API
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="gemini-key">Clé API Gemini</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="gemini-key"
                          type="password"
                          placeholder="AIza..."
                          value={geminiApiKey}
                          onChange={(e) => handleGeminiApiKeyChange(e.target.value)}
                        />
                        <Button
                          onClick={() => testConnection('gemini-embedding-004')}
                          disabled={!geminiApiKey || testingConnection}
                          size="sm"
                        >
                          {testingConnection ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Tester'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {connectionStatus && (
                  <Alert className={`${connectionStatus.success ? 'border-green-200' : 'border-red-200'}`}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div>
                        <strong>{connectionStatus.provider}:</strong> {connectionStatus.message}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Label>Provider d'embeddings</Label>
                  <Select 
                    value={ragConfig.embeddingProvider} 
                    onValueChange={(value: keyof typeof EMBEDDING_PROVIDERS) => 
                      setRagConfig(prev => ({ ...prev, embeddingProvider: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EMBEDDING_PROVIDERS).map(([key, provider]) => {
                        const isConfigured = embeddingService.isProviderConfigured(key as keyof typeof EMBEDDING_PROVIDERS)
                        return (
                          <SelectItem key={key} value={key} disabled={!isConfigured}>
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {provider.name} - {provider.model}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  ${provider.costPer1KTokens}/1k • {provider.dimensions}D
                                </span>
                                {!isConfigured && (
                                  <Badge variant="secondary" className="text-xs">
                                    Non configuré
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Les providers non configurés sont désactivés. Configurez les clés API ci-dessus.
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Seuil de similarité: {ragConfig.similarityThreshold}</Label>
                  <Slider
                    value={[ragConfig.similarityThreshold]}
                    onValueChange={(value) => 
                      setRagConfig(prev => ({ ...prev, similarityThreshold: value[0] }))
                    }
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Nombre max de résultats: {ragConfig.maxMatches}</Label>
                  <Slider
                    value={[ragConfig.maxMatches]}
                    onValueChange={(value) => 
                      setRagConfig(prev => ({ ...prev, maxMatches: value[0] }))
                    }
                    min={1}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="datasets" className="space-y-4">
              {loadingDatasets ? (
                <div className="text-center py-4">Chargement des datasets...</div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Aucun dataset disponible
                </div>
              ) : (
                <div className="space-y-3">
                  {datasets.map((dataset) => (
                    <Card key={dataset.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{dataset.name}</span>
                            {dataset.hasEmbeddings ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Indexé
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Non indexé
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mt-1">
                            {dataset.embeddingsCount ? (
                              <>
                                {dataset.embeddingsCount} embeddings
                                {dataset.lastIndexed && (
                                  <> • Indexé le {new Date(dataset.lastIndexed).toLocaleDateString()}</>
                                )}
                              </>
                            ) : (
                              'Pas encore indexé'
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => previewIndexing(dataset.id)}
                            disabled={dataset.isIndexing || !isConfigured}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {dataset.hasEmbeddings ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reindexDataset(dataset.id)}
                              disabled={dataset.isIndexing || !isConfigured}
                            >
                              {dataset.isIndexing ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => indexDataset(dataset.id)}
                              disabled={dataset.isIndexing || !isConfigured}
                            >
                              {dataset.isIndexing ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Zap className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search-query">Requête de test</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="search-query"
                      placeholder="Entrez votre recherche..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button
                      onClick={testRAGSearch}
                      disabled={!searchQuery.trim() || searchingRag || !isConfigured}
                    >
                      {searchingRag ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {searchResult && (
                  <Card className="p-4">
                    <div className="mb-3">
                      <h4 className="font-semibold">
                        Résultats de recherche ({searchResult.matches.length})
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Seuil: {searchResult.threshold} • Query: "{searchResult.query}"
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {searchResult.matches.map((match, index) => (
                        <div key={match.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">
                              Similarité: {(match.similarity * 100).toFixed(1)}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {match.metadata?.source_file || 'Source inconnue'}
                            </span>
                          </div>
                          <p className="text-sm">{match.content}</p>
                        </div>
                      ))}
                      
                      {searchResult.matches.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          Aucun résultat trouvé
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              {gemStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold">{gemStats.total_embeddings}</div>
                    <div className="text-sm text-muted-foreground">Total embeddings</div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="text-2xl font-bold">{gemStats.datasets.length}</div>
                    <div className="text-sm text-muted-foreground">Datasets indexés</div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="text-2xl font-bold">
                      {Math.round(gemStats.total_content_size / 1024)} KB
                    </div>
                    <div className="text-sm text-muted-foreground">Contenu indexé</div>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-4">Chargement des statistiques...</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}