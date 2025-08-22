import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  File, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react'
import { DatasetService } from '../../lib/datasetService'
import { FileParserService } from '../../lib/fileParserService'
import type { UploadProgress, SupportedFileType, ParsedFileData } from '../../types/dataset.types'
import { UPLOAD_CONFIG, formatFileSize, getFileIcon } from '../../types/dataset.types'

interface FileUploadProps {
  gemId: string
  onUploadComplete?: (datasets: any[]) => void
  maxFiles?: number
}

interface FileWithStatus {
  file: File
  status: UploadProgress['status']
  progress: number
  error?: string
  preview?: ParsedFileData
}

export function FileUpload({ gemId, onUploadComplete, maxFiles = 5 }: FileUploadProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Valider le nombre de fichiers
    if (files.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} fichiers autorisés`)
      return
    }

    // Ajouter les fichiers avec statut initial
    const newFiles: FileWithStatus[] = acceptedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Prévisualiser chaque fichier
    for (let i = 0; i < newFiles.length; i++) {
      const fileWithStatus = newFiles[i]
      
      try {
        // Valider le fichier
        const validation = FileParserService.validateFile(fileWithStatus.file)
        if (!validation.isValid) {
          updateFileStatus(fileWithStatus.file.name, 'error', 0, validation.error)
          continue
        }

        // Parser pour l'aperçu
        updateFileStatus(fileWithStatus.file.name, 'processing', 25)
        const parsedData = await FileParserService.parseFile(fileWithStatus.file)
        
        setFiles(prev => prev.map(f => 
          f.file.name === fileWithStatus.file.name 
            ? { ...f, preview: parsedData, status: 'pending', progress: 100 }
            : f
        ))

      } catch (error) {
        updateFileStatus(
          fileWithStatus.file.name, 
          'error', 
          0, 
          error instanceof Error ? error.message : 'Erreur de parsing'
        )
      }
    }
  }, [files.length, maxFiles])

  const updateFileStatus = (fileName: string, status: UploadProgress['status'], progress: number, error?: string) => {
    setFiles(prev => prev.map(f => 
      f.file.name === fileName 
        ? { ...f, status, progress, error }
        : f
    ))
  }

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.file.name !== fileName))
  }

  const uploadFiles = async () => {
    setUploading(true)
    const uploadedDatasets: any[] = []

    for (const fileWithStatus of files) {
      if (fileWithStatus.status === 'error') continue

      try {
        const dataset = await DatasetService.uploadFile(
          gemId,
          fileWithStatus.file,
          (progress) => {
            updateFileStatus(fileWithStatus.file.name, progress.status, progress.progress, progress.error)
          }
        )
        uploadedDatasets.push(dataset)
      } catch (error) {
        updateFileStatus(
          fileWithStatus.file.name, 
          'error', 
          0, 
          error instanceof Error ? error.message : 'Erreur d\'upload'
        )
      }
    }

    setUploading(false)
    onUploadComplete?.(uploadedDatasets)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    maxFiles: maxFiles - files.length,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf']
    }
  })

  const StatusIcon = ({ status }: { status: UploadProgress['status'] }) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <File className="h-4 w-4 text-muted-foreground" />
    }
  }

  const canUpload = files.length > 0 && files.some(f => f.status === 'pending') && !uploading
  const hasErrors = files.some(f => f.status === 'error')

  return (
    <div className="space-y-6">
      {/* Zone de drop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de fichiers
          </CardTitle>
          <CardDescription>
            Glissez-déposez vos fichiers ou cliquez pour les sélectionner.
            Formats supportés: CSV, Excel, JSON, TXT, PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p>Relâchez les fichiers ici...</p>
            ) : (
              <div>
                <p className="mb-2">Cliquez ou glissez-déposez vos fichiers</p>
                <p className="text-sm text-muted-foreground">
                  Maximum {maxFiles} fichiers • Max {formatFileSize(UPLOAD_CONFIG.maxFileSize)} par fichier
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Fichiers sélectionnés ({files.length})</span>
              {canUpload && (
                <Button onClick={uploadFiles} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Uploader tout
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((fileWithStatus, index) => (
                <div key={`${fileWithStatus.file.name}-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getFileIcon(fileWithStatus.file.type.includes('csv') ? 'csv' : 
                                   fileWithStatus.file.type.includes('sheet') ? 'xlsx' :
                                   fileWithStatus.file.type.includes('json') ? 'json' :
                                   fileWithStatus.file.type.includes('pdf') ? 'pdf' : 'txt')}
                      </span>
                      <div>
                        <p className="font-medium">{fileWithStatus.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(fileWithStatus.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={fileWithStatus.status} />
                      {fileWithStatus.status === 'pending' && !uploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileWithStatus.file.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Barre de progression */}
                  {fileWithStatus.progress > 0 && fileWithStatus.status !== 'error' && (
                    <div className="mb-2">
                      <Progress value={fileWithStatus.progress} className="h-2" />
                    </div>
                  )}

                  {/* Erreur */}
                  {fileWithStatus.error && (
                    <Alert variant="destructive" className="mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{fileWithStatus.error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Aperçu des données */}
                  {fileWithStatus.preview && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {fileWithStatus.preview.type.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">
                          {fileWithStatus.preview.metadata?.rows || 0} lignes
                        </Badge>
                        {fileWithStatus.preview.columns && (
                          <Badge variant="secondary">
                            {fileWithStatus.preview.columns.length} colonnes
                          </Badge>
                        )}
                      </div>
                      
                      {/* Aperçu des colonnes */}
                      {fileWithStatus.preview.columns && fileWithStatus.preview.columns.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">Colonnes:</p>
                          <div className="flex flex-wrap gap-1">
                            {fileWithStatus.preview.columns.slice(0, 10).map((col, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {col}
                              </Badge>
                            ))}
                            {fileWithStatus.preview.columns.length > 10 && (
                              <Badge variant="outline" className="text-xs">
                                +{fileWithStatus.preview.columns.length - 10} autres
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Aperçu des données */}
                      {fileWithStatus.preview.preview.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Aperçu (5 premières lignes):</p>
                          <div className="text-xs font-mono bg-background p-2 rounded border max-h-32 overflow-y-auto">
                            <pre>{JSON.stringify(fileWithStatus.preview.preview.slice(0, 3), null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages d'aide */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Certains fichiers ont des erreurs. Corrigez-les ou supprimez-les avant l'upload.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}