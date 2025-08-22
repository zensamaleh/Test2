import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Settings2, 
  Key, 
  Shield, 
  Palette, 
  Bell, 
  Save,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Copy,
  Trash2
} from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { toast } from 'sonner'

export function Settings() {
  const { user } = useAuthContext()
  
  // États pour les paramètres généraux
  const [language, setLanguage] = useState('fr')
  const [theme, setTheme] = useState('system')
  const [autoSave, setAutoSave] = useState(true)
  const [notifications, setNotifications] = useState(true)
  
  // États pour les clés API
  const [geminiKey, setGeminiKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [showKeys, setShowKeys] = useState(false)
  const [keysStatus, setKeysStatus] = useState({
    gemini: false,
    openrouter: false
  })

  // États pour les paramètres de sécurité
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState('24')
  
  // État pour les modifications non sauvegardées
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    // Charger les paramètres depuis localStorage ou l'API
    loadSettings()
  }, [])

  const loadSettings = () => {
    // Charger depuis localStorage pour l'instant
    const savedSettings = localStorage.getItem('gemcraft-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setLanguage(settings.language || 'fr')
      setTheme(settings.theme || 'system')
      setAutoSave(settings.autoSave ?? true)
      setNotifications(settings.notifications ?? true)
      setSessionTimeout(settings.sessionTimeout || '24')
    }

    // Charger les clés API (masquées)
    const savedGeminiKey = localStorage.getItem('gemini-api-key')
    const savedOpenrouterKey = localStorage.getItem('openrouter-api-key')
    
    if (savedGeminiKey) {
      setGeminiKey('*'.repeat(32))
      setKeysStatus(prev => ({ ...prev, gemini: true }))
    }
    
    if (savedOpenrouterKey) {
      setOpenrouterKey('*'.repeat(32))
      setKeysStatus(prev => ({ ...prev, openrouter: true }))
    }
  }

  const saveSettings = () => {
    const settings = {
      language,
      theme,
      autoSave,
      notifications,
      sessionTimeout,
      updatedAt: new Date().toISOString()
    }

    localStorage.setItem('gemcraft-settings', JSON.stringify(settings))
    setHasUnsavedChanges(false)
    toast.success('Paramètres sauvegardés avec succès')
  }

  const saveApiKey = (key: string, value: string) => {
    if (value && !value.startsWith('*')) {
      localStorage.setItem(key, value)
      toast.success('Clé API sauvegardée')
      
      // Mettre à jour le statut
      if (key === 'gemini-api-key') {
        setKeysStatus(prev => ({ ...prev, gemini: true }))
        setGeminiKey('*'.repeat(32))
      } else if (key === 'openrouter-api-key') {
        setKeysStatus(prev => ({ ...prev, openrouter: true }))
        setOpenrouterKey('*'.repeat(32))
      }
    }
  }

  const deleteApiKey = (key: string) => {
    localStorage.removeItem(key)
    toast.success('Clé API supprimée')
    
    if (key === 'gemini-api-key') {
      setKeysStatus(prev => ({ ...prev, gemini: false }))
      setGeminiKey('')
    } else if (key === 'openrouter-api-key') {
      setKeysStatus(prev => ({ ...prev, openrouter: false }))
      setOpenrouterKey('')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié dans le presse-papiers')
  }

  if (!user) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Vous devez être connecté pour accéder aux paramètres</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            Paramètres
          </h1>
          <p className="text-muted-foreground">
            Gérez vos préférences et la configuration de GemCraft
          </p>
        </div>
        
        {hasUnsavedChanges && (
          <Button onClick={saveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        )}
      </div>

      {/* Contenu principal avec onglets */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="api">Clés API</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="appearance">Apparence</TabsTrigger>
        </TabsList>

        {/* Onglet Général */}
        <TabsContent value="general">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Préférences générales</CardTitle>
                <CardDescription>
                  Configurez les paramètres de base de l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Langue</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Timeout de session (heures)</Label>
                    <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 heure</SelectItem>
                        <SelectItem value="6">6 heures</SelectItem>
                        <SelectItem value="12">12 heures</SelectItem>
                        <SelectItem value="24">24 heures</SelectItem>
                        <SelectItem value="168">1 semaine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sauvegarde automatique</Label>
                      <p className="text-sm text-muted-foreground">
                        Sauvegarde automatiquement vos modifications
                      </p>
                    </div>
                    <Switch
                      checked={autoSave}
                      onCheckedChange={(checked) => {
                        setAutoSave(checked)
                        setHasUnsavedChanges(true)
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Recevoir des notifications sur les activités importantes
                      </p>
                    </div>
                    <Switch
                      checked={notifications}
                      onCheckedChange={(checked) => {
                        setNotifications(checked)
                        setHasUnsavedChanges(true)
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onglet Clés API */}
        <TabsContent value="api">
          <div className="space-y-6">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                Les clés API sont stockées localement dans votre navigateur. 
                Elles ne sont jamais envoyées à nos serveurs.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Clé API Gemini
                  {keysStatus.gemini && (
                    <Badge variant="secondary" className="ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurée
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Nécessaire pour les embeddings RAG et l'analyse de données.
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    Obtenir une clé API →
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type={showKeys ? "text" : "password"}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKeys(!showKeys)}
                  >
                    {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={() => saveApiKey('gemini-api-key', geminiKey)}
                    disabled={!geminiKey || geminiKey.startsWith('*')}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                  {keysStatus.gemini && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteApiKey('gemini-api-key')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Clé API OpenRouter
                  {keysStatus.openrouter && (
                    <Badge variant="secondary" className="ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurée
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Nécessaire pour les modèles de chat IA (Gemini, DeepSeek, etc.).
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    Obtenir une clé API →
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type={showKeys ? "text" : "password"}
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKeys(!showKeys)}
                  >
                    {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={() => saveApiKey('openrouter-api-key', openrouterKey)}
                    disabled={!openrouterKey || openrouterKey.startsWith('*')}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                  {keysStatus.openrouter && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteApiKey('openrouter-api-key')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Configuration recommandée :</strong> Les deux clés API sont nécessaires 
                pour utiliser toutes les fonctionnalités de GemCraft. La clé Gemini est utilisée 
                pour le RAG et l'analyse, tandis qu'OpenRouter gère les conversations IA.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        {/* Onglet Sécurité */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Sécurité du compte
                </CardTitle>
                <CardDescription>
                  Gérez les paramètres de sécurité de votre compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Authentification à deux facteurs</Label>
                    <p className="text-sm text-muted-foreground">
                      Ajouter une couche de sécurité supplémentaire
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Informations du compte</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">ID utilisateur</Label>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {user.id.substring(0, 8)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(user.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Actions dangereuses</h4>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      La suppression de votre compte est irréversible. Toutes vos données 
                      seront définitivement perdues.
                    </AlertDescription>
                  </Alert>
                  <Button variant="destructive" disabled>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer le compte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onglet Apparence */}
        <TabsContent value="appearance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Thème et apparence
                </CardTitle>
                <CardDescription>
                  Personnalisez l'apparence de l'interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Thème</Label>
                  <Select value={theme} onValueChange={(value) => {
                    setTheme(value)
                    setHasUnsavedChanges(true)
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Clair</SelectItem>
                      <SelectItem value="dark">Sombre</SelectItem>
                      <SelectItem value="system">Système</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choisissez le thème ou suivez les paramètres système
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Préférences d'affichage</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Animations</Label>
                        <p className="text-sm text-muted-foreground">
                          Activer les animations de l'interface
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Mode compact</Label>
                        <p className="text-sm text-muted-foreground">
                          Réduire l'espacement pour plus de contenu
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}