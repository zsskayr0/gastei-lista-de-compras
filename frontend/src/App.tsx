import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './lib/auth/authStore';
import { useAppStore } from './state/appStore';
import { useListsStore } from './state/listsStore';
import { useMembersStore } from './state/membersStore';
import { useThemeSync } from './hooks/useTheme';
import { AppShell } from './components/layout/AppShell';
import { Skeleton } from './components/ui/Skeleton';
import { CrashBoundary, ErrorHost, useGlobalErrorCapture } from './components/ui/ErrorViews';
import { ErrorLogSettings } from './features/settings/ErrorLogSettings';

import { LoginPage } from './features/auth/LoginPage';
import { BootstrapFamilyPage } from './features/auth/BootstrapFamilyPage';
import { AcceptInvitePage } from './features/auth/AcceptInvitePage';
import { InboxPage } from './features/inbox/InboxPage';
import { CasaPage } from './features/casa/CasaPage';
import { CasaListPage } from './features/casa/CasaListPage';
import { CorporativoPage } from './features/corporativo/CorporativoPage';
import { CorporativoListPage } from './features/corporativo/CorporativoListPage';
import { SettingsHome } from './features/settings/SettingsHome';
import { AccountSettings } from './features/settings/AccountSettings';
import { DeviceSettings } from './features/settings/DeviceSettings';
import { FamilySettings } from './features/settings/FamilySettings';
import { OwnerOnly } from './features/settings/OwnerOnly';
import { CategoriesSettings } from './features/settings/CategoriesSettings';
import { CatalogSettings } from './features/settings/CatalogSettings';
import { TermsSettings } from './features/settings/TermsSettings';
import { HistorySettings } from './features/settings/HistorySettings';
import { SyncSettings } from './features/settings/SyncSettings';

function BootScreen() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function SignedInRoutes() {
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!session) return;
    void useListsStore.getState().init({
      userId: session.user.id,
      familyId: session.familyId,
      deviceId: session.deviceSessionId,
    });
    void useMembersStore.getState().init(session.familyId);
  }, [session]);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/casa" element={<CasaPage />} />
        <Route path="/casa/:listId" element={<CasaListPage />} />
        <Route path="/corporativo" element={<CorporativoPage />} />
        <Route path="/corporativo/:listId" element={<CorporativoListPage />} />
        <Route path="/ajustes" element={<SettingsHome />} />
        <Route path="/ajustes/conta" element={<AccountSettings />} />
        <Route path="/ajustes/aparelho" element={<DeviceSettings />} />
        <Route path="/ajustes/familia" element={<FamilySettings />} />
        <Route path="/ajustes/erros" element={<ErrorLogSettings />} />
        <Route path="/ajustes/categorias" element={<OwnerOnly><CategoriesSettings /></OwnerOnly>} />
        <Route path="/ajustes/catalogo" element={<OwnerOnly><CatalogSettings /></OwnerOnly>} />
        <Route path="/ajustes/catalogo/termos" element={<OwnerOnly><TermsSettings /></OwnerOnly>} />
        <Route path="/ajustes/historico" element={<OwnerOnly><HistorySettings /></OwnerOnly>} />
        <Route path="/ajustes/sincronizacao" element={<OwnerOnly><SyncSettings /></OwnerOnly>} />
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Route>
    </Routes>
  );
}

function SignedOutRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/bootstrap" element={<BootstrapFamilyPage />} />
      <Route path="/convite/:token" element={<AcceptInvitePage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  const status = useAuthStore((s) => s.status);
  const restoreAuth = useAuthStore((s) => s.restore);
  const restoreApp = useAppStore((s) => s.restore);
  useThemeSync();
  useGlobalErrorCapture();

  useEffect(() => {
    void restoreAuth();
    void restoreApp();
  }, [restoreAuth, restoreApp]);

  return (
    <CrashBoundary>
      <BrowserRouter>
        <div className="h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
          {status === 'loading' && <BootScreen />}
          {status === 'signed-out' && <SignedOutRoutes />}
          {status === 'signed-in' && <SignedInRoutes />}
        </div>
        <ErrorHost />
      </BrowserRouter>
    </CrashBoundary>
  );
}

export default App;
