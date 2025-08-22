import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Chat, Message } from '../types'
import { v4 as uuidv4 } from 'uuid'

// Fonction utilitaire pour transformer les données DB en Chat
const transformChatFromDB = (dbChat: any): Chat => ({
  ...dbChat,
  messages: Array.isArray(dbChat.messages) ? dbChat.messages as Message[] : []
})

export function useChats(gemId?: string, userId?: string) {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (gemId && userId) {
      fetchChats()
    }
  }, [gemId, userId])

  const fetchChats = async () => {
    if (!gemId || !userId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('gem_id', gemId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const parsedChats = (data || []).map(transformChatFromDB)

      setChats(parsedChats)
      
      // Set current chat to the most recent one
      if (parsedChats.length > 0) {
        setCurrentChat(parsedChats[0])
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const createChat = async (sessionName?: string): Promise<Chat> => {
    if (!gemId || !userId) throw new Error('Missing gemId or userId')

    try {
      const newChat = {
        id: uuidv4(),
        gem_id: gemId,
        user_id: userId,
        session_name: sessionName || `Session ${new Date().toLocaleDateString('fr-FR')}`,
        messages: []
      }

      const { data, error } = await supabase
        .from('chats')
        .insert(newChat)
        .select()
        .single()

      if (error) throw error

      const chat = transformChatFromDB(data)

      setChats(prev => [chat, ...prev])
      setCurrentChat(chat)
      return chat
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const updateChat = async (chatId: string, updates: Partial<Chat>) => {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('chats')
        .update(updateData)
        .eq('id', chatId)
        .select()
        .single()

      if (error) throw error

      const updatedChat = transformChatFromDB(data)

      setChats(prev => 
        prev.map(chat => chat.id === chatId ? updatedChat : chat)
      )
      
      if (currentChat?.id === chatId) {
        setCurrentChat(updatedChat)
      }

      return updatedChat
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const addMessage = async (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    try {
      const chat = chats.find(c => c.id === chatId)
      if (!chat) throw new Error('Chat not found')

      const newMessage: Message = {
        ...message,
        id: uuidv4(),
        timestamp: new Date().toISOString()
      }

      const updatedMessages = [...chat.messages, newMessage]

      await updateChat(chatId, { messages: updatedMessages })
      return newMessage
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const deleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)

      if (error) throw error

      setChats(prev => prev.filter(chat => chat.id !== chatId))
      
      if (currentChat?.id === chatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId)
        setCurrentChat(remainingChats.length > 0 ? remainingChats[0] : null)
      }
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const renameChat = async (chatId: string, newName: string) => {
    await updateChat(chatId, { session_name: newName })
  }

  return {
    chats,
    currentChat,
    loading,
    error,
    setCurrentChat,
    createChat,
    addMessage,
    deleteChat,
    renameChat,
    fetchChats
  }
}