/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView';
import History from './pages/History';
import Config from './pages/Config';
import Relatorios from './pages/Relatorios';
import Login from './pages/Login';

// Sprint 2 P2 — lazy load (não pesa no bundle inicial)
const DashboardExecutivo = lazy(() => import('./pages/DashboardExecutivo'));
import { InvoiceProvider } from './store/InvoiceContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ToastContainer } from './components/organisms/ToastContainer';
import { BackendStatusBanner } from './components/organisms/BackendStatusBanner';
import { OnboardingTour } from './components/organisms/OnboardingTour';
import { GamificationDock } from './components/organisms/GamificationDock';
import { BadgeUnlockContainer } from './components/organisms/BadgeUnlockContainer';
import { useFeatureFlags } from './stores/useFeatureFlags';
import { api } from './services/api';

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const setFlags = useFeatureFlags((s) => s.setFlags);

  // Carrega feature flags 1x após login (Sprint 1 / A4)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.getFeatureFlags()
      .then((res) => {
        if (cancelled) return;
        setFlags(res.flags as any);
      })
      .catch((e) => {
        console.warn('[FeatureFlags] erro ao carregar — usando defaults:', e);
      });
    return () => { cancelled = true; };
  }, [user, setFlags]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F26522] mx-auto mb-3" />
          <p className="text-sm text-slate-500">Carregando…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Login />;
  return (
    <>
      <BackendStatusBanner />
      {children}
      <OnboardingTour />
      <GamificationDock />
      <BadgeUnlockContainer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <InvoiceProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="calendario" element={<CalendarView />} />
                <Route path="relatorios" element={<Relatorios />} />
                <Route path="historico" element={<History />} />
                <Route path="configuracao" element={<Config />} />
                <Route
                  path="executivo"
                  element={
                    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[#F26522]" />Carregando dashboard executivo…</div>}>
                      <DashboardExecutivo />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
          <ToastContainer />
        </InvoiceProvider>
      </AuthGate>
    </AuthProvider>
  );
}
