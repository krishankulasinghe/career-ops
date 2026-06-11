import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '@/hooks/useTheme';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { OnboardingPage } from '@/pages/Onboarding';
import { DashboardPage } from '@/pages/Dashboard';
import { ApplicationsPage } from '@/pages/Applications';
import { NewEvaluationPage } from '@/pages/NewEvaluation';
import { EvaluationDetailPage } from '@/pages/EvaluationDetail';
import { PipelinePage } from '@/pages/Pipeline';
import { ProfilePage } from '@/pages/Profile';
import { SettingsPage } from '@/pages/Settings';
import { NotFoundPage } from '@/pages/NotFound';
import { PortalsPage } from '@/pages/Portals';
import { ScannerPage } from '@/pages/Scanner';
import { AnalyticsPage } from '@/pages/Analytics';
import { TeamPage } from '@/pages/Team';
import { AuditPage } from '@/pages/Audit';
import { AISettingsPage } from '@/pages/AISettings';
import { AdminCostsPage } from '@/pages/AdminCosts';
import { PromptSettingsPage } from '@/pages/PromptSettings';
import { AdminInsightsPage } from '@/pages/AdminInsights';
import { SSOSettingsPage } from '@/pages/SSOSettings';
import { EvalModesPage } from '@/pages/EvalModes';
import { WebhooksPage } from '@/pages/Webhooks';
import { InterviewPrepPage } from '@/pages/InterviewPrep';
import { BrandingSettingsPage } from '@/pages/BrandingSettings';
import { ApiKeyAnalyticsPage } from '@/pages/ApiKeyAnalytics';
import { MarketplacePage } from '@/pages/Marketplace';
import { IntegrationsPage } from '@/pages/Integrations';
import { DataResidencyPage } from '@/pages/DataResidency';
import { TrustCenterPage } from '@/pages/TrustCenter';
import { GettingStartedPage } from '@/pages/docs/GettingStarted';
import { UserGuidePage } from '@/pages/docs/UserGuide';
import { FaqPage } from '@/pages/docs/Faq';
import { ConfigurationPage } from '@/pages/docs/Configuration';
import { StylingPage } from '@/pages/docs/Styling';
import { DarkModePage } from '@/pages/docs/DarkMode';
import { PluginPage } from '@/pages/docs/Plugin';
import { GulpPage } from '@/pages/docs/Gulp';
import { DesignFilePage } from '@/pages/docs/DesignFile';
import { ChangelogPage } from '@/pages/docs/Changelog';
import '@/styles/overrides.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/onboarding" element={
            <ProtectedRoute><OnboardingPage /></ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/applications" element={
            <ProtectedRoute><ApplicationsPage /></ProtectedRoute>
          } />
          <Route path="/evaluations/new" element={
            <ProtectedRoute><NewEvaluationPage /></ProtectedRoute>
          } />
          <Route path="/evaluations/:id" element={
            <ProtectedRoute><EvaluationDetailPage /></ProtectedRoute>
          } />
          <Route path="/pipeline" element={
            <ProtectedRoute><PipelinePage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
          <Route path="/portals" element={
            <ProtectedRoute><PortalsPage /></ProtectedRoute>
          } />
          <Route path="/scanner" element={
            <ProtectedRoute><ScannerPage /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute><TeamPage /></ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute><AuditPage /></ProtectedRoute>
          } />
          <Route path="/settings/ai" element={
            <ProtectedRoute><AISettingsPage /></ProtectedRoute>
          } />
          <Route path="/admin/ai-costs" element={
            <ProtectedRoute><AdminCostsPage /></ProtectedRoute>
          } />
          <Route path="/settings/prompts" element={
            <ProtectedRoute><PromptSettingsPage /></ProtectedRoute>
          } />
          <Route path="/admin/insights" element={
            <ProtectedRoute><AdminInsightsPage /></ProtectedRoute>
          } />
          <Route path="/settings/sso" element={
            <ProtectedRoute><SSOSettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/evaluation-modes" element={
            <ProtectedRoute><EvalModesPage /></ProtectedRoute>
          } />
          <Route path="/settings/webhooks" element={
            <ProtectedRoute><WebhooksPage /></ProtectedRoute>
          } />
          <Route path="/interview-prep" element={
            <ProtectedRoute><InterviewPrepPage /></ProtectedRoute>
          } />
          <Route path="/settings/branding" element={
            <ProtectedRoute><BrandingSettingsPage /></ProtectedRoute>
          } />
          <Route path="/api-keys/analytics" element={
            <ProtectedRoute><ApiKeyAnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/marketplace" element={
            <ProtectedRoute><MarketplacePage /></ProtectedRoute>
          } />
          <Route path="/settings/integrations" element={
            <ProtectedRoute><IntegrationsPage /></ProtectedRoute>
          } />
          <Route path="/settings/data-residency" element={
            <ProtectedRoute><DataResidencyPage /></ProtectedRoute>
          } />
          <Route path="/docs" element={<ProtectedRoute><UserGuidePage /></ProtectedRoute>} />
          <Route path="/docs/getting-started" element={<ProtectedRoute><GettingStartedPage /></ProtectedRoute>} />
          <Route path="/docs/faq" element={<ProtectedRoute><FaqPage /></ProtectedRoute>} />
          <Route path="/docs/configuration" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />
          <Route path="/docs/styling" element={<ProtectedRoute><StylingPage /></ProtectedRoute>} />
          <Route path="/docs/dark-mode" element={<ProtectedRoute><DarkModePage /></ProtectedRoute>} />
          <Route path="/docs/plugin" element={<ProtectedRoute><PluginPage /></ProtectedRoute>} />
          <Route path="/docs/gulp" element={<ProtectedRoute><GulpPage /></ProtectedRoute>} />
          <Route path="/docs/design-file" element={<ProtectedRoute><DesignFilePage /></ProtectedRoute>} />
          <Route path="/docs/changelog" element={<ProtectedRoute><ChangelogPage /></ProtectedRoute>} />

          {/* Public — no ProtectedRoute */}
          <Route path="/trust" element={<TrustCenterPage />} />

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
