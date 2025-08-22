import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Loader2, Trash2, Eye } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useGems } from '../hooks/useGems'
import { aiService } from '../lib/aiService'
import type { GemSettings, Gem } from '../types'

export function EditGem() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthContext()
  const { gems, updateGem, deleteGem } = useGems(user?.id)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gem, setGem] = useState<Gem | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
    is_public: false
  })
  
  const [settings, setSettings] = useState<GemSettings>({
    model: 'google/gemini-2.0-flash-exp:free',
    temperature: 0.7,
    maxTokens: 1000,
    responseStyle: 'detailed',
    responseFormat: 'text',
    enableCharts: false,
    enableSimilarity: false
  })

  // Charger le gem à éditer
  useEffect(() => {
    if (!id || !gems.length) return
    
    const targetGem = gems.find(g => g.id === id)
    if (!targetGem) {
      setError('Gem introuvable')
      return
    }
    
    if (targetGem.user_id !== user?.id) {
      setError('Vous n\'avez pas les permissions pour éditer ce Gem')
      return
    }
    
    setGem(targetGem)
    setFormData({
      name: targetGem.name,
      description: targetGem.description || '',
      prompt: targetGem.prompt,
      is_public: targetGem.is_public
    })
    
    if (targetGem.settings) {
      setSettings(targetGem.settings as GemSettings)
    }
  }, [id, gems, user?.id])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.prompt.trim()) {
      setError('Le nom et le prompt sont obligatoires')
      return
    }
    
    if (!gem) return
    
    setLoading(true)
    setError(null)
    
    try {
      await updateGem(gem.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        prompt: formData.prompt.trim(),
        is_public: formData.is_public,
        settings
      })
      
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!gem) return
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce Gem ? Cette action est irréversible.')) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      await deleteGem(gem.id)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      setLoading(false)
    }
  }

  if (!gem && !error) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Chargement...</span>
        </div>
      </div>
    )
  }

  if (error && !gem) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au Dashboard
        </Button>
      </div>
    )
  }

  const availableModels = aiService.getAvailableModels()

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Éditer le Gem</h1>
            <p className="text-gray-600">
              Modifier "{gem?.name}" et ses paramètres
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/chat/${gem?.id}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Tester
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 mb-6">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleUpdate}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Informations générales</TabsTrigger>
            <TabsTrigger value="prompt">Prompt & Comportement</TabsTrigger>
            <TabsTrigger value="settings">Paramètres IA</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations du Gem</CardTitle>
                <CardDescription>
                  Nom et description publique de votre assistant IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du Gem *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Analyseur de produits"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez brièvement ce que fait votre Gem..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_public: checked }))
                    }
                  />
                  <Label htmlFor="is_public" className="cursor-pointer">
                    Rendre ce Gem public dans la galerie
                  </Label>
                </div>

                {formData.is_public && (
                  <Alert>
                    <AlertDescription>
                      Ce Gem sera visible par tous les utilisateurs dans la galerie publique.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prompt Système</CardTitle>
                <CardDescription>
                  Instructions qui définissent le comportement et la personnalité de votre Gem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Tu es un assistant IA spécialisé en..."
                  rows={12}
                  className="font-mono"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Soyez précis sur le rôle, le style de réponse et les domaines d'expertise.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration IA</CardTitle>
                <CardDescription>
                  Paramètres techniques pour optimiser les réponses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="model">Modèle IA</Label>
                  <Select
                    value={settings.model}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => {
                        const info = aiService.getModelInfo(model)
                        return (
                          <SelectItem key={model} value={model}>
                            <div className="flex items-center gap-2">
                              <span>{info?.name || model}</span>
                              {info?.free && <Badge variant="secondary">Gratuit</Badge>}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="temperature">
                    Créativité: {settings.temperature}
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      temperature: parseFloat(e.target.value) 
                    }))}
                    className="w-full mt-2"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Précis</span>
                    <span>Créatif</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="maxTokens">Longueur de réponse maximale</Label>
                  <Select
                    value={settings.maxTokens?.toString() || '1000'}
                    onValueChange={(value) => setSettings(prev => ({ 
                      ...prev, 
                      maxTokens: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">Courte (500 tokens)</SelectItem>
                      <SelectItem value="1000">Moyenne (1000 tokens)</SelectItem>
                      <SelectItem value="2000">Longue (2000 tokens)</SelectItem>
                      <SelectItem value="4000">Très longue (4000 tokens)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="responseStyle">Style de réponse</Label>
                  <Select
                    value={settings.responseStyle}
                    onValueChange={(value: 'short' | 'detailed' | 'table' | 'analysis') => 
                      setSettings(prev => ({ ...prev, responseStyle: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Court et concis</SelectItem>
                      <SelectItem value="detailed">Détaillé et complet</SelectItem>
                      <SelectItem value="analysis">Analyse approfondie</SelectItem>
                      <SelectItem value="table">Format tableau</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard')}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}