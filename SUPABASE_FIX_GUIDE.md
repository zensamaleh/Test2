# Guide de Correction des Politiques RLS Supabase

## Problème
Erreur: **"new row violates row-level security policy"** lors de l'upload de fichiers.

## Cause
Les politiques RLS (Row Level Security) de Supabase sont mal configurées, empêchant l'insertion de nouvelles données.

## Solution

### 1. Accéder à Supabase SQL Editor
1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Sélectionnez le projet **ploisxrjfwqjvuuifyuv**
3. Allez dans **SQL Editor** dans la barre latérale

### 2. Exécuter le Script de Correction
Copiez et exécutez le contenu du fichier `supabase-schema-fixed.sql` dans l'éditeur SQL.

### 3. Vérifications
Après l'exécution, vérifiez que :
- ✅ Les tables existent sans erreur
- ✅ Les politiques RLS sont correctement créées
- ✅ Les triggers sont fonctionnels

### 4. Test
Testez l'upload d'un fichier CSV dans l'application.

## Points Clés Corrigés

### Politiques Users
```sql
-- AVANT (manquait la politique INSERT)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- APRÈS (ajout de la politique INSERT)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Politiques Datasets
```sql
-- AVANT (politique trop générale)
CREATE POLICY "Users can manage datasets of their gems" ON public.datasets
  FOR ALL USING (...);

-- APRÈS (politiques séparées par action)
CREATE POLICY "Users can insert datasets of their gems" ON public.datasets
  FOR INSERT WITH CHECK (...);
```

### Storage Bucket
Assurez-vous que le bucket **"datasets"** existe dans **Storage** avec les bonnes politiques :

```sql
-- Politique de lecture
CREATE POLICY "Users can read their own dataset files"
ON storage.objects FOR SELECT
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Politique d'écriture  
CREATE POLICY "Users can upload dataset files"
ON storage.objects FOR INSERT
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
```

## En Cas de Problème Persistant

### Option 1: Désactiver temporairement RLS
```sql
ALTER TABLE public.datasets DISABLE ROW LEVEL SECURITY;
```

### Option 2: Créer des politiques permissives
```sql
CREATE POLICY "Allow all for authenticated users" ON public.datasets
  FOR ALL TO authenticated USING (true);
```

### Option 3: Vérifier l'authentification
```javascript
// Dans le code, vérifier que l'utilisateur est bien connecté
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user)
```