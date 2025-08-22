import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Eye, 
  Copy, 
  User,
  Sparkles,
  Filter
} from 'lucide-react'
import { useGems } from '../hooks/useGems'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Gem } from '../types'

export function Gallery() {
  const { cloneGem } = useGems()
  const [publicGems, setPublicGems] = useState<Gem[]>([])
  const [filteredGems, setFilteredGems] = useState<Gem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchPublicGems()
  }, [])

  useEffect(() => {
    filterGems()
  }, [publicGems, searchQuery, selectedCategory])

  const fetchPublicGems = async () => {
    // For now, we'll create some mock data since we don't have real public gems yet
    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      const mockGems: Gem[] = [
        {
          id: '1',
          name: 'Analyseur de Produits Premium',
          description: 'Analyse détaillée de produits avec comparaisons avancées et recommandations personnalisées.',
          prompt: 'Tu es un expert en analyse de produits...',
          user_id: 'demo-user-1',
          avatar_url: null,
          is_public: true,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          settings: {
            model: 'google/gemini-2.0-flash-exp:free',
            temperature: 0.7,
            maxTokens: 1500,
            responseStyle: 'detailed',
            responseFormat: 'markdown',
            enableCharts: true,
            enableSimilarity: true
          }
        },
        {
          id: '2',
          name: 'Conseiller Financier IA',
          description: 'Assistant spécialisé dans l\'analyse financière et les conseils d\'investissement.',
          prompt: 'Tu es un conseiller financier expert...',
          user_id: 'demo-user-2',
          avatar_url: null,
          is_public: true,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          settings: {
            model: 'deepseek/deepseek-r1-0528:free',
            temperature: 0.5,
            maxTokens: 2000,
            responseStyle: 'analysis',
            responseFormat: 'markdown',
            enableCharts: true,
            enableSimilarity: false
          }
        }
      ]
      
      setPublicGems(mockGems)
      setLoading(false)
    }, 1000)
  }

  const filterGems = () => {
    let filtered = publicGems

    if (searchQuery) {
      filtered = filtered.filter(gem => 
        gem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gem.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredGems(filtered)
  }

  const handleCloneGem = async (gemId: string, gemName: string) => {
    try {
      const cloned = await cloneGem(gemId)
      alert(`Gem "${gemName}" cloné avec succès !`)
    } catch (error) {
      alert('Erreur lors du clonage du Gem')
    }
  }

  const getGemIcon = () => '💎'

  if (loading) {
    return (
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Galerie des Gems</h1>
        <p className="text-muted-foreground">
          Découvrez et clonez les assistants IA créés par la communauté
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un Gem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGems.map((gem) => (
          <Card key={gem.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={gem.avatar_url || undefined} />
                    <AvatarFallback>{getGemIcon()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">{gem.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Public
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(gem.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="line-clamp-3 mb-4">
                {gem.description || 'Aucune description'}
              </CardDescription>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Créé par utilisateur</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/gem/${gem.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleCloneGem(gem.id, gem.name)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Cloner
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGems.length === 0 && !loading && (
        <div className="text-center py-16">
          <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Aucun Gem trouvé</h3>
          <p className="text-muted-foreground">
            {searchQuery 
              ? 'Essayez de modifier votre recherche'
              : 'Aucun Gem public disponible pour le moment'
            }
          </p>
        </div>
      )}
    </div>
  )
}