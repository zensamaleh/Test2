import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Edit3, 
  Save,
  X,
  Sparkles,
  MessageSquare,
  Database,
  Settings
} from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useGems } from '../hooks/useGems'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function Profile() {
  const { user } = useAuthContext()
  const { gems } = useGems()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    display_name: user?.full_name || user?.email?.split('@')[0] || '',
    bio: '',
    location: '',
    website: ''
  })

  const userGems = gems?.filter(gem => gem.user_id === user?.id) || []
  const totalChats = userGems.reduce((acc, gem) => acc + (gem.chats?.length || 0), 0)

  const handleSave = async () => {
    // TODO: Implémenter la sauvegarde du profil via Supabase
    console.log('Saving profile:', formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      display_name: user?.full_name || user?.email?.split('@')[0] || '',
      bio: '',
      location: '',
      website: ''
    })
    setIsEditing(false)
  }

  if (!user) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Vous devez être connecté pour voir votre profil</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header du profil */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {(formData.display_name || user.email || '').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{formData.display_name}</h1>
              <Badge variant="secondary" className="hidden md:inline-flex">
                <Sparkles className="h-3 w-3 mr-1" />
                Créateur
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            
            {user.created_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Membre depuis {formatDistanceToNow(new Date(user.created_at), { 
                  addSuffix: true, 
                  locale: fr 
                })}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ml-auto">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {isEditing ? 'Annuler' : 'Modifier le profil'}
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-full">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userGems.length}</p>
                <p className="text-muted-foreground">Gems créés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/10 p-3 rounded-full">
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalChats}</p>
                <p className="text-muted-foreground">Conversations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-3 rounded-full">
                <Database className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {userGems.reduce((acc, gem) => acc + (gem.datasets?.length || 0), 0)}
                </p>
                <p className="text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal avec onglets */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="gems">Mes Gems</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Gérez vos informations de profil et préférences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Nom d'affichage</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        placeholder="Votre nom d'affichage"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          className="pl-10"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Paris, France"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Site web</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://monsite.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Biographie</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Parlez-nous de vous..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {formData.bio && (
                    <div>
                      <h4 className="font-medium mb-2">Biographie</h4>
                      <p className="text-muted-foreground">{formData.bio}</p>
                    </div>
                  )}

                  {formData.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.location}</span>
                    </div>
                  )}

                  {formData.website && (
                    <div>
                      <a 
                        href={formData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {formData.website}
                      </a>
                    </div>
                  )}

                  {!formData.bio && !formData.location && !formData.website && (
                    <p className="text-muted-foreground italic">
                      Aucune information personnelle renseignée.{' '}
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-primary hover:underline"
                      >
                        Modifier votre profil
                      </button>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gems">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Mes Gems ({userGems.length})</h3>
              <Button asChild size="sm">
                <Link to="/create">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Nouveau Gem
                </Link>
              </Button>
            </div>

            {userGems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Aucun Gem créé</h3>
                  <p className="text-muted-foreground mb-6">
                    Créez votre premier Gem pour commencer à construire votre assistant IA personnalisé
                  </p>
                  <Button asChild>
                    <Link to="/create">Créer mon premier Gem</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGems.map((gem) => (
                  <Card key={gem.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg line-clamp-1">{gem.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {gem.description || 'Aucune description'}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="ml-2 flex-shrink-0">
                          {gem.is_public ? 'Public' : 'Privé'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>
                          Créé {formatDistanceToNow(new Date(gem.created_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button asChild size="sm" className="flex-1">
                          <Link to={`/gem/${gem.id}`}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/gem/${gem.id}/edit`}>
                            <Edit3 className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>Vos dernières interactions avec GemCraft</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground text-center py-8">
                  L'historique d'activité sera disponible prochainement
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/create">
                <Sparkles className="h-4 w-4 mr-2" />
                Nouveau Gem
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/gallery">
                <Database className="h-4 w-4 mr-2" />
                Explorer la galerie
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}