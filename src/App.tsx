import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

// Pages
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import { CreateGem } from './pages/CreateGem'
import { EditGem } from './pages/EditGem'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { Gallery } from './pages/Gallery'
import { ChatPage } from './pages/ChatPage'
import { DataManagementPage } from './pages/DataManagementPage'
import { AIConfiguration } from './components/ai/AIConfiguration'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// GemCraft V2 - Ready for Production
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/create" 
                element={
                  <ProtectedRoute>
                    <CreateGem />
                  </ProtectedRoute>
                } 
              />
              {/* Placeholder routes for future development */}
              <Route 
                path="/gem/:id" 
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/gem/:id/data" 
                element={
                  <ProtectedRoute>
                    <DataManagementPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/gem/:id/edit" 
                element={
                  <ProtectedRoute>
                    <EditGem />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ai-config" 
                element={
                  <ProtectedRoute>
                    <AIConfiguration />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}
