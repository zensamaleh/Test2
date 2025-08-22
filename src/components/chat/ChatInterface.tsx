import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  BarChart3, 
  FileText,
  Clock,
  Search,
  Database
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Message, Chat, Gem } from '../../types'

interface ChatInterfaceProps {
  gem: Gem
  chat: Chat | null
  onSendMessage: (content: string) => Promise<void>
  loading?: boolean
}

export function ChatInterface({ gem, chat, onSendMessage, loading }: ChatInterfaceProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chat?.messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    const messageContent = message.trim()
    setMessage('')
    setSending(true)

    try {
      await onSendMessage(messageContent)
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun chat sélectionné</h3>
          <p className="text-muted-foreground">
            Créez une nouvelle session pour commencer
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={gem.avatar_url || undefined} />
            <AvatarFallback>
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-semibold">{gem.name}</h2>
            <p className="text-sm text-muted-foreground">
              {chat.session_name || 'Session sans nom'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatDistanceToNow(new Date(chat.updated_at), { 
                addSuffix: true, 
                locale: fr 
              })}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {chat.messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Commencez une conversation avec {gem.name}
              </p>
            </div>
          ) : (
            chat.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  {gem.name} réfléchit...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Posez une question à ${gem.name}...`}
            className="min-h-[50px] max-h-[150px] resize-none"
            disabled={sending || loading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!message.trim() || sending || loading}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start space-x-2 max-w-[80%] ${
        isUser ? 'flex-row-reverse space-x-reverse' : ''
      }`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback>
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        
        <div className={`rounded-lg p-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {message.content.split('\n').map((line, index) => (
              <p key={index} className="mb-1 last:mb-0">
                {line || '\u00A0'}
              </p>
            ))}
          </div>
          
          {/* Metadata */}
          {message.metadata && (
            <div className="mt-3 space-y-2">
              {/* RAG Context */}
              {message.metadata.ragContext && (
                <div className="text-xs space-y-1">
                  {message.metadata.ragContext.contextUsed ? (
                    <div className="opacity-75">
                      <Search className="h-3 w-3 inline mr-1" />
                      Réponse basée sur {message.metadata.ragContext.searchResult.matches.length} source(s)
                    </div>
                  ) : (
                    <div className="opacity-60">
                      <Database className="h-3 w-3 inline mr-1" />
                      Recherche dans les données effectuée (aucun résultat pertinent)
                    </div>
                  )}
                  {message.metadata.ragContext.sources.length > 0 && (
                    <div className="opacity-60 text-[10px]">
                      Sources: {message.metadata.ragContext.sources.slice(0, 2).join(', ')}
                      {message.metadata.ragContext.sources.length > 2 && 
                        ` et ${message.metadata.ragContext.sources.length - 2} autre(s)`
                      }
                    </div>
                  )}
                </div>
              )}
              
              {/* Other metadata */}
              {message.metadata.similarItems && message.metadata.similarItems.length > 0 && (
                <div className="text-xs opacity-75">
                  <FileText className="h-3 w-3 inline mr-1" />
                  {message.metadata.similarItems.length} éléments similaires trouvés
                </div>
              )}
              {message.metadata.charts && message.metadata.charts.length > 0 && (
                <div className="text-xs opacity-75">
                  <BarChart3 className="h-3 w-3 inline mr-1" />
                  {message.metadata.charts.length} graphique(s) généré(s)
                </div>
              )}
              {message.metadata.processingTime && (
                <div className="text-xs opacity-75">
                  Traité en {message.metadata.processingTime}ms
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs opacity-50 mt-2">
            {formatDistanceToNow(new Date(message.timestamp), { 
              addSuffix: true, 
              locale: fr 
            })}
          </div>
        </div>
      </div>
    </div>
  )
}