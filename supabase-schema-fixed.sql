-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gems table
CREATE TABLE IF NOT EXISTS public.gems (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create datasets table
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gem_id UUID REFERENCES public.gems(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gem_id UUID REFERENCES public.gems(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  session_name TEXT,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector embeddings table for RAG
CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gem_id UUID REFERENCES public.gems(id) ON DELETE CASCADE NOT NULL,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI embeddings dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gems_user_id ON public.gems(user_id);
CREATE INDEX IF NOT EXISTS idx_gems_is_public ON public.gems(is_public);
CREATE INDEX IF NOT EXISTS idx_datasets_gem_id ON public.datasets(gem_id);
CREATE INDEX IF NOT EXISTS idx_chats_gem_id ON public.chats(gem_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_gem_id ON public.embeddings(gem_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_dataset_id ON public.embeddings(dataset_id);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx ON public.embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_gems_updated_at ON public.gems;
DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gems_updated_at 
  BEFORE UPDATE ON public.gems 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at 
  BEFORE UPDATE ON public.chats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own gems" ON public.gems;
DROP POLICY IF EXISTS "Users can view public gems" ON public.gems;
DROP POLICY IF EXISTS "Users can insert own gems" ON public.gems;
DROP POLICY IF EXISTS "Users can update own gems" ON public.gems;
DROP POLICY IF EXISTS "Users can delete own gems" ON public.gems;
DROP POLICY IF EXISTS "Users can manage datasets of their gems" ON public.datasets;
DROP POLICY IF EXISTS "Users can manage their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can manage embeddings of their gems" ON public.embeddings;

-- Users policies - FIXED
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Gems policies
CREATE POLICY "Users can view own gems" ON public.gems
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public gems" ON public.gems
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own gems" ON public.gems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gems" ON public.gems
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gems" ON public.gems
  FOR DELETE USING (auth.uid() = user_id);

-- Datasets policies - SIMPLIFIED
CREATE POLICY "Users can select datasets of their gems" ON public.datasets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gems 
      WHERE gems.id = datasets.gem_id 
      AND gems.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert datasets of their gems" ON public.datasets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gems 
      WHERE gems.id = datasets.gem_id 
      AND gems.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update datasets of their gems" ON public.datasets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.gems 
      WHERE gems.id = datasets.gem_id 
      AND gems.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete datasets of their gems" ON public.datasets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.gems 
      WHERE gems.id = datasets.gem_id 
      AND gems.user_id = auth.uid()
    )
  );

-- Chats policies - SIMPLIFIED
CREATE POLICY "Users can select their own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON public.chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON public.chats
  FOR DELETE USING (auth.uid() = user_id);

-- Embeddings policies - SIMPLIFIED
CREATE POLICY "Users can select embeddings of their gems" ON public.embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gems 
      WHERE gems.id = embeddings.gem_id 
      AND gems.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert embeddings of their gems" ON public.embeddings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gems 
      WHERE gems.id = embeddings.gem_id 
      AND gems.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update embeddings of their gems" ON public.embeddings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.gems 
      WHERE gems.id = embeddings.gem_id 
      AND gems.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete embeddings of their gems" ON public.embeddings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.gems 
      WHERE gems.id = embeddings.gem_id 
      AND gems.user_id = auth.uid()
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_gem_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.content,
    embeddings.metadata,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  FROM public.embeddings
  WHERE embeddings.gem_id = match_gem_id
    AND 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;