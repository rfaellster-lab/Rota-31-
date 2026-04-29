/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView';
import History from './pages/History';
import Config from './pages/Config';
import Login from './pages/Login';
import { InvoiceProvider } from './store/InvoiceContext';
import { AuthProvider, useAuth } from './store/AuthContext';

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
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
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <InvoiceProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="calendario" element={<CalendarView />} />
                <Route path="historico" element={<History />} />
                <Route path="configuracao" element={<Config />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </InvoiceProvider>
      </AuthGate>
    </AuthProvider>
  );
}
