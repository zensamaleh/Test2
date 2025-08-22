import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Database, Upload, Loader2, AlertTriangle, Search } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useGems } from '../hooks/useGems'
import { FileUpload } from '../components/dataset/FileUpload'
import { DatasetManager } from '../components/dataset/DatasetManager'
import RAGManager from '../components/rag/RAGManager'
import type { Gem } from '../types'

export function DataManagementPage() {
  const { id: gemId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { getGem } = useGems(user?.id)
  
  const [gem, setGem] = useState<Gem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Charger le Gem
  useEffect(() => {
    const loadGem = async () => {
      if (!gemId) {
        setError('ID du Gem manquant')
        setLoading(false)
        return
      }

      try {
        const gemData = await getGem(gemId)
        if (!gemData) {
          setError('Gem introuvable')
        } else {
          setGem(gemData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }

    loadGem()
  }, [gemId, getGem])

  const handleDatasetChange = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleUploadComplete = (datasets: any[]) => {
    console.log('Upload terminé:', datasets)
    handleDatasetChange()
  }

  if (loading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          Chargement...
        </div>
      </div>
    )
  }

  if (error || !gem) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || 'Gem introuvable'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/gem/${gemId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au chat
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Gestion des données</h1>
          <p className="text-muted-foreground">
            {gem.name} • Gérez les fichiers de données de votre Gem
          </p>
        </div>
      </div>

      {/* Informations du Gem */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {gem.name}
          </CardTitle>
          <CardDescription>
            {gem.description || 'Aucune description'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p><strong>Créé le:</strong> {new Date(gem.created_at).toLocaleDateString()}</p>
            <p><strong>Type:</strong> {gem.is_public ? 'Public' : 'Privé'}</p>
            <p><strong>Modèle IA:</strong> {gem.settings?.model || 'Par défaut'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Gestion des données */}
      <Tabs defaultValue="manage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage">
            <Database className="h-4 w-4 mr-2" />
            Datasets
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="rag">
            <Search className="h-4 w-4 mr-2" />
            Indexation RAG
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage">
          <DatasetManager 
            key={refreshKey}
            gemId={gemId!} 
            onDatasetChange={handleDatasetChange}
          />
        </TabsContent>

        <TabsContent value="upload">
          <FileUpload
            gemId={gemId!}
            onUploadComplete={handleUploadComplete}
            maxFiles={10}
          />
        </TabsContent>

        <TabsContent value="rag">
          <RAGManager
            gem={gem}
            onIndexingUpdate={(stats) => {
              console.log('Statistiques d\'indexation:', stats)
              handleDatasetChange()
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}