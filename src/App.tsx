import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { PipelinePage } from './pages/PipelinePage'
import { LeadsPage } from './pages/LeadsPage'
import { LeadDetailPage } from './pages/LeadDetailPage'
import { LeadFormPage } from './pages/LeadFormPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectFormPage } from './pages/ProjectFormPage'
import { LoginPage } from './pages/LoginPage'
import { SetupPage } from './pages/SetupPage'

// HashRouter works reliably on GitHub Pages without server rewrite rules.
const Router = import.meta.env.PROD ? HashRouter : BrowserRouter

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/leads/new" element={<LeadFormPage />} />
              <Route path="/leads/:id" element={<LeadDetailPage />} />
              <Route path="/leads/:id/edit" element={<LeadFormPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/new" element={<ProjectFormPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
