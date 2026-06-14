import type { ReactElement } from "react";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { fetchMe, setUnauthorizedHandler } from "./api/client";
import { useAuthStore } from "./store/auth";
import { AppLayout } from "./layout/AppLayout";
import { SettingsLayout } from "./layout/SettingsLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
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
import { DocsDocumentPage, DocsIndexPage } from "./pages/DocsPage";
import { HelpDocumentPage, HelpIndexPage } from "./pages/HelpPage";
import { LiveChatPage } from "./pages/LiveChatPage";
import { LiveWidgetSettingsPage } from "./pages/LiveWidgetSettingsPage";
import { TeamSettingsPage } from "./pages/TeamSettingsPage";

function AuthBootstrap(): null {
  const setToken = useAuthStore((s) => s.setToken);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
    });
    return () => setUnauthorizedHandler(null);
  }, [setToken]);

  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    void fetchMe()
      .then((data) => setSession(token, data.user, data.workspace))
      .catch(() => setToken(null));
  }, [setSession, setToken]);

  return null;
}

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
      <AuthBootstrap />
      <Routes>
        <Route path="/" element={<HomeEntry />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/help" element={<HelpIndexPage />} />
        <Route path="/help/:slug" element={<HelpDocumentPage />} />
        <Route path="/docs" element={<DocsIndexPage />} />
        <Route path="/docs/:slug" element={<DocsDocumentPage />} />
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
          <Route path="live-chat" element={<LiveChatPage />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<SettingsPage />} />
            <Route path="live-widget" element={<LiveWidgetSettingsPage />} />
            <Route path="team" element={<TeamSettingsPage />} />
            <Route path="inboxes" element={<InboxSettingsPage />} />
            <Route path="sla" element={<SlaSettingsPage />} />
            <Route path="canned" element={<CannedResponsesPage />} />
            <Route path="kb" element={<KnowledgeBasePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
