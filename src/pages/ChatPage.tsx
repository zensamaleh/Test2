import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2, AlertTriangle, Database } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { useGems } from '../hooks/useGems'
import { useChats } from '../hooks/useChats'
import { useAI } from '../hooks/useAI'
import { ChatInterface } from '../components/chat/ChatInterface'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import type { Chat } from '../types'
import type { AIError } from '../types/ai.types'

export function ChatPage() {
  const { id: gemId } = useParams<{ id: string }>()
  const { user } = useAuthContext()
  const { getGem } = useGems(user?.id)
  const { 
    chats, 
    currentChat, 
    loading: chatsLoading, 
    error: chatsError,
    setCurrentChat,
    createChat,
    addMessage,
    deleteChat,
    renameChat
  } = useChats(gemId, user?.id)
  
  const { generateResponse, loading: aiLoading, error: aiError, clearError } = useAI()

  const [gem, setGem] = useState<any>(null)
  const [gemLoading, setGemLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    if (gemId) {
      fetchGem()
    }
  }, [gemId])

  const fetchGem = async () => {
    if (!gemId) return

    try {
      setGemLoading(true)
      const gemData = await getGem(gemId)
      if (!gemData) {
        setError('Gem introuvable')
      } else {
        setGem(gemData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setGemLoading(false)
    }
  }

  const handleCreateChat = async () => {
    try {
      await createChat()
    } catch (error) {
      console.error('Erreur lors de la création du chat:', error)
    }
  }

  const handleSelectChat = (chat: Chat) => {
    setCurrentChat(chat)
  }

  const handleDeleteChat = async (chatId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
      try {
        await deleteChat(chatId)
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    }
  }

  const handleRenameChat = async (chatId: string, newName: string) => {
    try {
      await renameChat(chatId, newName)
    } catch (error) {
      console.error('Erreur lors du renommage:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (sendingMessage) return
    
    setSendingMessage(true)
    clearError()
    
    try {
      let chatToUse = currentChat
      
      // Créer un chat si nécessaire
      if (!chatToUse) {
        chatToUse = await createChat()
      }
      
      // Ajouter le message utilisateur
      await addMessage(chatToUse.id, {
        role: 'user',
        content
      })
      
      // Générer la réponse IA avec RAG
      const aiResponse = await generateResponse(gem, chatToUse.messages, content, true) // RAG activé par défaut
      
      if (aiResponse) {
        // Ajouter la réponse de l'IA avec les informations RAG
        await addMessage(chatToUse.id, {
          role: 'assistant',
          content: aiResponse.content,
          metadata: {
            processingTime: aiResponse.usage?.processingTime || 0,
            model: aiResponse.model,
            usage: aiResponse.usage,
            ragContext: aiResponse.ragContext // Inclure les informations RAG
          }
        })
      } else {
        // Erreur IA - ajouter un message d'erreur
        await addMessage(chatToUse.id, {
          role: 'assistant',
          content: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer dans un moment.',
          metadata: {
            error: true,
            processingTime: 0
          }
        })
      }
      
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error)
      
      // Ajouter un message d'erreur si possible
      if (currentChat) {
        try {
          await addMessage(currentChat.id, {
            role: 'assistant',
            content: 'Une erreur est survenue. Veuillez réessayer.',
            metadata: {
              error: true,
              processingTime: 0
            }
          })
        } catch (addError) {
          console.error('Erreur lors de l\'ajout du message d\'erreur:', addError)
        }
      }
    } finally {
      setSendingMessage(false)
    }
  }

  const getAIErrorMessage = (aiError: AIError) => {
    switch (aiError.type) {
      case 'api_key':
        return 'Clé API manquante ou invalide. Configurez vos clés API dans les paramètres.'
      case 'rate_limit':
        return 'Limite de taux atteinte. Patientez quelques minutes avant de réessayer.'
      case 'model_error':
        return 'Erreur du modèle IA. Essayez avec un autre modèle ou réessayez plus tard.'
      case 'network':
        return 'Problème de connexion. Vérifiez votre connexion internet.'
      default:
        return aiError.message || 'Erreur inconnue du service IA'
    }
  }

  if (gemLoading || chatsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !gem) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'Gem introuvable'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{gem.name}</h1>
              <p className="text-sm text-muted-foreground">
                {gem.description || 'Chat avec votre assistant IA'}
              </p>
            </div>
          </div>
          <div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/gem/${gemId}/data`}>
                <Database className="h-4 w-4 mr-2" />
                Gérer les données
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          chats={chats}
          currentChat={currentChat}
          onSelectChat={handleSelectChat}
          onCreateChat={handleCreateChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          loading={chatsLoading}
        />
        
        <div className="flex-1 flex flex-col">
          {chatsError && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{chatsError}</AlertDescription>
            </Alert>
          )}
          
          {aiError && (
            <Alert variant="destructive" className="m-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {getAIErrorMessage(aiError)}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={clearError}
                >
                  Fermer
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <ChatInterface
            gem={gem}
            chat={currentChat}
            onSendMessage={handleSendMessage}
            loading={chatsLoading || sendingMessage}
          />
        </div>
      </div>
    </div>
  )
}