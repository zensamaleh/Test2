export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gems: {
        Row: {
          id: string
          name: string
          description: string | null
          prompt: string
          user_id: string
          avatar_url: string | null
          is_public: boolean
          created_at: string
          updated_at: string
          settings: Json | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          prompt: string
          user_id: string
          avatar_url?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          settings?: Json | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          prompt?: string
          user_id?: string
          avatar_url?: string | null
          is_public?: boolean
          updated_at?: string
          settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gems_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      datasets: {
        Row: {
          id: string
          gem_id: string
          file_name: string
          file_path: string
          file_type: string
          file_size: number
          metadata: Json | null
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          gem_id: string
          file_name: string
          file_path: string
          file_type: string
          file_size: number
          metadata?: Json | null
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          gem_id?: string
          file_name?: string
          file_path?: string
          file_type?: string
          file_size?: number
          metadata?: Json | null
          processed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "datasets_gem_id_fkey"
            columns: ["gem_id"]
            isOneToOne: false
            referencedRelation: "gems"
            referencedColumns: ["id"]
          }
        ]
      }
      chats: {
        Row: {
          id: string
          gem_id: string
          user_id: string
          session_name: string | null
          messages: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gem_id: string
          user_id: string
          session_name?: string | null
          messages?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gem_id?: string
          user_id?: string
          session_name?: string | null
          messages?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_gem_id_fkey"
            columns: ["gem_id"]
            isOneToOne: false
            referencedRelation: "gems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      embeddings: {
        Row: {
          id: string
          gem_id: string
          dataset_id: string
          content: string
          metadata: Json | null
          embedding: number[]
          created_at: string
        }
        Insert: {
          id?: string
          gem_id: string
          dataset_id: string
          content: string
          metadata?: Json | null
          embedding: number[]
          created_at?: string
        }
        Update: {
          id?: string
          gem_id?: string
          dataset_id?: string
          content?: string
          metadata?: Json | null
          embedding?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_gem_id_fkey"
            columns: ["gem_id"]
            isOneToOne: false
            referencedRelation: "gems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embeddings_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_embeddings: {
        Args: {
          query_embedding: number[]
          match_gem_id?: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          content: string
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}