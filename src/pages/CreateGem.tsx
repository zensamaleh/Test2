import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { ArrowLeft, Upload, Sparkles, Loader2 } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useGems } from '../hooks/useGems'
import { GEM_TEMPLATES, DEFAULT_GEM_SETTINGS } from '../types'
import type { GemSettings } from '../types'

export function CreateGem() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { createGem } = useGems(user?.id)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
    is_public: false
  })
  
  const [settings, setSettings] = useState<GemSettings>(DEFAULT_GEM_SETTINGS)

  const handleTemplateSelect = (template: typeof GEM_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      prompt: template.prompt
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.prompt.trim()) {
      setError('Le nom et le prompt sont obligatoires')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const newGem = await createGem({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        prompt: formData.prompt.trim(),
        settings,
        is_public: formData.is_public
      })

      navigate(`/gem/${newGem.id}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Créer un nouveau Gem</h1>
          <p className="text-muted-foreground">
            Configurez votre assistant IA personnalisé
          </p>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">Configuration de base</TabsTrigger>
          <TabsTrigger value="data">Données</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="advanced">Avancé</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>
                  Définissez les caractéristiques principales de votre Gem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du Gem</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Analyseur de produits"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez brièvement ce que fait votre Gem..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt système</Label>
                  <Textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Tu es un expert en... Aide l'utilisateur à..."
                    rows={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Le prompt définit le comportement et la personnalité de votre assistant IA
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="public">Rendre ce Gem public</Label>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le Gem
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates prédéfinis</CardTitle>
              <CardDescription>
                Commencez avec un template optimisé pour votre cas d'usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GEM_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{template.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres avancés</CardTitle>
              <CardDescription>
                Personnalisez le comportement de l'IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Modèle IA</Label>
                  <Select
                    value={settings.model}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/gemini-2.0-flash-exp:free">
                        Gemini 2.0 Flash (Gratuit)
                      </SelectItem>
                      <SelectItem value="deepseek/deepseek-r1-0528:free">
                        DeepSeek R1 (Gratuit)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responseStyle">Style de réponse</Label>
                  <Select
                    value={settings.responseStyle}
                    onValueChange={(value: any) => setSettings(prev => ({ ...prev, responseStyle: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Court</SelectItem>
                      <SelectItem value="detailed">Détaillé</SelectItem>
                      <SelectItem value="table">Tableau comparatif</SelectItem>
                      <SelectItem value="analysis">Analyse approfondie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">
                    Température ({settings.temperature})
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
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Plus élevé = plus créatif, plus bas = plus précis
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Tokens maximum</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={settings.maxTokens}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      maxTokens: parseInt(e.target.value) 
                    }))}
                    min={100}
                    max={4000}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableCharts"
                    checked={settings.enableCharts}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableCharts: checked }))}
                  />
                  <Label htmlFor="enableCharts">Activer les graphiques automatiques</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableSimilarity"
                    checked={settings.enableSimilarity}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSimilarity: checked }))}
                  />
                  <Label htmlFor="enableSimilarity">Activer la recherche de similarité</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}