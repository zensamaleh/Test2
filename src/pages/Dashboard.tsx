import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  MessageSquare, 
  Database, 
  MoreVertical, 
  Edit3, 
  Trash2,
  Eye,
  Copy,
  Share2,
  Sparkles
} from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useGems } from '../hooks/useGems'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function Dashboard() {
  const { user } = useAuthContext()
  const { gems, loading, error, deleteGem } = useGems(user?.id)

  const handleDeleteGem = async (gemId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce Gem ?')) {
      try {
        await deleteGem(gemId)
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    }
  }

  const getGemIcon = (settings: any) => {
    // Extract icon from settings or use default based on prompt
    return '💎'
  }

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mes Gems</h1>
          <p className="text-muted-foreground">
            Gérez vos assistants IA personnalisés
          </p>
        </div>
        <Button asChild>
          <Link to="/create">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Gem
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {gems.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun Gem créé</h3>
              <p className="text-muted-foreground">
                Créez votre premier assistant IA personnalisé pour commencer
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/create">
                <Plus className="h-4 w-4 mr-2" />
                Créer mon premier Gem
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gems.map((gem) => (
            <Card key={gem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={gem.avatar_url || undefined} />
                      <AvatarFallback>{getGemIcon(gem.settings)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{gem.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {gem.is_public && (
                          <Badge variant="secondary" className="text-xs">
                            Public
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(gem.updated_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/gem/${gem.id}`}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Ouvrir le chat
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/gem/${gem.id}/edit`}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Modifier
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="h-4 w-4 mr-2" />
                        Partager
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteGem(gem.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-3 mb-4">
                  {gem.description || 'Aucune description'}
                </CardDescription>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 mr-1" />
                      {gem.datasets?.length || 0} datasets
                    </div>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {gem.chats?.length || 0} chats
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/gem/${gem.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


    </div>
  )
}