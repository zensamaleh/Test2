import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  MessageSquare, 
  MoreVertical, 
  Edit3, 
  Trash2,
  Calendar
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Chat } from '../../types'
import { cn } from '@/lib/utils'

interface ChatSidebarProps {
  chats: Chat[]
  currentChat: Chat | null
  onSelectChat: (chat: Chat) => void
  onCreateChat: () => void
  onDeleteChat: (chatId: string) => void
  onRenameChat: (chatId: string, newName: string) => void
  loading?: boolean
}

export function ChatSidebar({ 
  chats, 
  currentChat, 
  onSelectChat, 
  onCreateChat,
  onDeleteChat,
  onRenameChat,
  loading 
}: ChatSidebarProps) {
  const [editingChat, setEditingChat] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleStartEdit = (chat: Chat) => {
    setEditingChat(chat.id)
    setEditName(chat.session_name || '')
  }

  const handleSaveEdit = (chatId: string) => {
    if (editName.trim()) {
      onRenameChat(chatId, editName.trim())
    }
    setEditingChat(null)
    setEditName('')
  }

  const handleCancelEdit = () => {
    setEditingChat(null)
    setEditName('')
  }

  const handleKeyPress = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(chatId)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div className="w-80 border-r bg-muted/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Sessions</h2>
          <Button size="sm" onClick={onCreateChat} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Aucune session de chat
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={onCreateChat}
              >
                Créer la première
              </Button>
            </div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="group relative">
                <div
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                    currentChat?.id === chat.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSelectChat(chat)}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    {editingChat === chat.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, chat.id)}
                        onBlur={() => handleSaveEdit(chat.id)}
                        className="h-6 text-sm"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="font-medium text-sm truncate">
                          {chat.session_name || 'Session sans nom'}
                        </p>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(chat.updated_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                          {chat.messages.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{chat.messages.length} messages</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {editingChat !== chat.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEdit(chat)
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Renommer
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteChat(chat.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}