import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Key, 
  Zap,
  ExternalLink,
  Info
} from 'lucide-react'
import { useAI } from '../../hooks/useAI'
import { AVAILABLE_MODELS } from '../../types/ai.types'

export function AIConfiguration() {
  const { testConnection, loading, error, clearError } = useAI()
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})
  const [apiKeys, setApiKeys] = useState({
    openrouter: import.meta.env.VITE_OPENROUTER_API_KEY || '',
    openai: import.meta.env.VITE_OPENAI_API_KEY || ''
  })

  const handleTestModel = async (modelId: string) => {
    clearError()
    const result = await testConnection(modelId)
    setTestResults(prev => ({ ...prev, [modelId]: result }))
  }

  const handleTestAll = async () => {
    clearError()
    for (const model of AVAILABLE_MODELS) {
      if (model.provider === 'openrouter') {
        await handleTestModel(model.id)
      }
    }
  }

  const getModelStatus = (modelId: string) => {
    if (loading) return 'testing'
    if (testResults[modelId] === true) return 'success'
    if (testResults[modelId] === false) return 'error'
    return 'unknown'
  }

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full bg-muted" />
    }
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuration IA</h1>
        <p className="text-muted-foreground">
          Configurez et testez vos connexions aux services IA
        </p>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="models">Modèles Disponibles</TabsTrigger>
          <TabsTrigger value="test">Tests de Connexion</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Clés API
                </CardTitle>
                <CardDescription>
                  Configurez vos clés API pour accéder aux différents services IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openrouter-key">
                    OpenRouter API Key 
                    <Badge variant="secondary" className="ml-2">Recommandé</Badge>
                  </Label>
                  <Input
                    id="openrouter-key"
                    type="password"
                    value={apiKeys.openrouter}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openrouter: e.target.value }))}
                    placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground">
                    Accès aux modèles Gemini et DeepSeek gratuits. 
                    <a 
                      href="https://openrouter.ai/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      Obtenir une clé <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-key">
                    OpenAI API Key 
                    <Badge variant="outline" className="ml-2">Optionnel</Badge>
                  </Label>
                  <Input
                    id="openai-key"
                    type="password"
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground">
                    Accès direct aux modèles OpenAI (payant).
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      Obtenir une clé <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configuration :</strong> Ajoutez vos clés API dans le fichier <code>.env</code> :
                    <br />
                    <code>VITE_OPENROUTER_API_KEY=votre_clé_ici</code>
                    <br />
                    <code>VITE_OPENAI_API_KEY=votre_clé_ici</code>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <div className="grid gap-4">
            {AVAILABLE_MODELS.map((model) => (
              <Card key={model.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{model.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {model.id}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{model.provider}</Badge>
                        {model.pricing ? (
                          <Badge variant="secondary">Payant</Badge>
                        ) : (
                          <Badge variant="default">Gratuit</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Context: {model.contextWindow.toLocaleString()}</div>
                      <div>Max tokens: {model.maxTokens.toLocaleString()}</div>
                      {model.pricing && (
                        <div className="mt-1">
                          <div>Input: ${model.pricing.input}/1K tokens</div>
                          <div>Output: ${model.pricing.output}/1K tokens</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="test">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Test des Connexions
                </CardTitle>
                <CardDescription>
                  Testez la connectivité avec les différents modèles IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handleTestAll} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Tester Tous les Modèles
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  {AVAILABLE_MODELS.filter(m => m.provider === 'openrouter').map((model) => {
                    const status = getModelStatus(model.id)
                    return (
                      <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <StatusIcon status={status} />
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-sm text-muted-foreground">{model.id}</div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestModel(model.id)}
                          disabled={loading}
                        >
                          Tester
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}