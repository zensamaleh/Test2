import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Database,
  Trash2, 
  Eye, 
  Download,
  AlertTriangle,
  FileText,
  BarChart3,
  Loader2
} from 'lucide-react'
import { DatasetService } from '../../lib/datasetService'
import { formatFileSize, getFileIcon } from '../../types/dataset.types'

interface DatasetManagerProps {
  gemId: string
  onDatasetChange?: () => void
}

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

export function DatasetManager({ gemId, onDatasetChange }: DatasetManagerProps) {
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDataset, setSelectedDataset] = useState<DatasetRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  // Charger les datasets
  const loadDatasets = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await DatasetService.getDatasets(gemId)
      setDatasets(data)
      
      // Charger les stats
      const statsData = await DatasetService.getDatasetStats(gemId)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDatasets()
  }, [gemId])

  const handleDelete = async (datasetId: string) => {
    try {
      setDeleting(datasetId)
      await DatasetService.deleteDataset(datasetId)
      await loadDatasets()
      onDatasetChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression')
    } finally {
      setDeleting(null)
    }
  }

  const handlePreview = (dataset: DatasetRow) => {
    setSelectedDataset(dataset)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Chargement des datasets...
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistiques des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalDatasets}</div>
                <div className="text-sm text-muted-foreground">Fichiers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalRows.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Lignes de données</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
                <div className="text-sm text-muted-foreground">Taille totale</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center gap-1 mb-1">
                  {Object.entries(stats.fileTypes).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}: {count as number}
                    </Badge>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">Types de fichiers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des datasets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Datasets ({datasets.length})
          </CardTitle>
          <CardDescription>
            Gérez vos fichiers de données uploadés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {datasets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun dataset uploadé</p>
              <p className="text-sm">Utilisez l'onglet "Upload" pour ajouter vos premiers fichiers</p>
            </div>
          ) : (
            <div className="space-y-4">
              {datasets.map((dataset) => (
                <div key={dataset.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getFileIcon(dataset.file_type as any)}
                      </span>
                      <div>
                        <h3 className="font-medium">{dataset.file_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {dataset.file_type.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatFileSize(dataset.file_size)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(dataset.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {dataset.metadata?.rows && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {dataset.metadata.rows.toLocaleString()} lignes
                            </Badge>
                            {dataset.metadata?.columns && (
                              <Badge variant="secondary" className="text-xs">
                                {dataset.metadata.columns.length} colonnes
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(dataset)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deleting === dataset.id}
                          >
                            {deleting === dataset.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer le dataset</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer "{dataset.file_name}" ?
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(dataset.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal d'aperçu */}
      {selectedDataset && (
        <AlertDialog open={!!selectedDataset} onOpenChange={() => setSelectedDataset(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Aperçu: {selectedDataset.file_name}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Dataset de type {selectedDataset.file_type.toUpperCase()} • {formatFileSize(selectedDataset.file_size)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              {/* Métadonnées */}
              <div>
                <h4 className="font-medium mb-2">Informations</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Lignes:</span> {selectedDataset.metadata?.rows || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Colonnes:</span> {selectedDataset.metadata?.columns?.length || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Taille:</span> {formatFileSize(selectedDataset.file_size)}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {new Date(selectedDataset.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Colonnes */}
              {selectedDataset.metadata?.columns && (
                <div>
                  <h4 className="font-medium mb-2">Colonnes</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedDataset.metadata.columns.map((col: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Aperçu des données */}
              {selectedDataset.metadata?.preview && (
                <div>
                  <h4 className="font-medium mb-2">Aperçu des données</h4>
                  <div className="border rounded-lg p-4 bg-muted/50 max-h-96 overflow-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedDataset.metadata.preview, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Fermer</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}