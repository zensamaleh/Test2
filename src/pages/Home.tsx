import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  ArrowRight, 
  Database, 
  MessageSquare, 
  BarChart3,
  Users,
  Zap,
  Shield
} from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { AuthModal } from '../components/auth/AuthModal'

const features = [
  {
    icon: Database,
    title: 'Multi-datasets',
    description: 'Importez plusieurs fichiers CSV, Excel, PDF et créez une base de connaissance unifiée'
  },
  {
    icon: MessageSquare,
    title: 'Chat intelligent',
    description: 'Conversations contextuelles avec historique et sessions nommées'
  },
  {
    icon: BarChart3,
    title: 'Visualisations automatiques',
    description: 'Graphiques et analyses générés automatiquement à partir de vos données'
  },
  {
    icon: Users,
    title: 'Partage communautaire',
    description: 'Partagez vos Gems ou découvrez ceux créés par la communauté'
  },
  {
    icon: Zap,
    title: 'IA avancée',
    description: 'Moteurs IA de pointe avec recherche sémantique et RAG'
  },
  {
    icon: Shield,
    title: 'Sécurisé',
    description: 'Vos données restent privées avec une sécurité de niveau entreprise'
  }
]

const useCases = [
  {
    title: 'Analyse de produits',
    description: 'Analysez et comparez des catalogues produits',
    icon: '📊'
  },
  {
    title: 'Support client',
    description: 'Assistant pour FAQ et documentation',
    icon: '🎧'
  },
  {
    title: 'Recherche académique',
    description: 'Explorez des corpus de documents',
    icon: '🎓'
  },
  {
    title: 'Analyse financière',
    description: 'Insights sur données financières',
    icon: '💰'
  }
]

export function Home() {
  const { user } = useAuthContext()
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-6">
                <Sparkles className="h-3 w-3 mr-1" />
                Plateforme SaaS V2
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Créez vos{' '}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  assistants IA
                </span>{' '}
                personnalisés
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                GemCraft transforme vos données en assistants intelligents. 
                Importez, analysez et chattez avec vos documents comme jamais auparavant.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <Button size="lg" asChild>
                    <Link to="/dashboard">
                      Accéder au Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => setShowAuthModal(true)}>
                    Commencer gratuitement
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="lg" asChild>
                  <Link to="/gallery">Découvrir la galerie</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Une plateforme complète pour créer, gérer et partager vos assistants IA
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="border-none shadow-none bg-background">
                  <CardHeader>
                    <feature.icon className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Cas d'usage populaires
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Découvrez comment GemCraft peut transformer votre workflow
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((useCase, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-4xl mb-2">{useCase.icon}</div>
                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{useCase.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à créer votre premier Gem ?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Rejoignez des milliers d'utilisateurs qui transforment leurs données en intelligence
            </p>
            {user ? (
              <Button size="lg" variant="secondary" asChild>
                <Link to="/create">
                  Créer mon premier Gem
                  <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => setShowAuthModal(true)}>
                Créer mon compte gratuit
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </section>
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  )
}