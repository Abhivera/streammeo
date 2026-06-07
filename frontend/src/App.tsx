import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { AppLayout } from "./layout/AppLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TicketsPage } from "./pages/TicketsPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { InboxSettingsPage } from "./pages/InboxSettingsPage";
import { SlaSettingsPage } from "./pages/SlaSettingsPage";
import { CannedResponsesPage } from "./pages/CannedResponsesPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { PortalTicketPage } from "./pages/PortalTicketPage";
import { PortalCsatPage } from "./pages/PortalCsatPage";
import { LegalDocumentPage, LegalIndexPage } from "./pages/LegalDocumentPage";

function Protected({ children }: { children: React.ReactNode }): ReactElement {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function HomeEntry(): ReactElement {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export default function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeEntry />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/legal" element={<LegalIndexPage />} />
        <Route path="/legal/:slug" element={<LegalDocumentPage />} />
        <Route path="/portal/ticket/:token" element={<PortalTicketPage />} />
        <Route path="/portal/csat/:token" element={<PortalCsatPage />} />
        <Route
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/inboxes" element={<InboxSettingsPage />} />
          <Route path="settings/sla" element={<SlaSettingsPage />} />
          <Route path="settings/canned" element={<CannedResponsesPage />} />
          <Route path="settings/kb" element={<KnowledgeBasePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
