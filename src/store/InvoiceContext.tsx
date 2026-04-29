/**
 * @file InvoiceContext.tsx
 * @description State global do painel — agora conectado ao backend real
 * @updated 2026-04-29 — substituído mockData por fetch /api/invoices
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Invoice } from '../types';
import { DateRange } from '../components/DateRangePicker';
import { api } from '../services/api';

interface InvoiceContextType {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  approveInvoice: (id: string, user: string) => Promise<void>;
  denyInvoice: (id: string, motivo: string) => Promise<void>;
  emitInvoice: (id: string) => void;
  bulkApproveInvoices: (ids: string[], user: string) => Promise<void>;
  addNoteToInvoice: (id: string, noteText: string, user: string) => void;
  snoozeInvoice: (id: string, date: string) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  globalDateRange: DateRange;
  setGlobalDateRange: (range: DateRange) => void;
  dryRun: boolean;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

const REFRESH_INTERVAL_MS = 60_000; // refetch a cada 1 minuto

export const InvoiceProvider = ({ children }: { children: ReactNode }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);

  // Filtro inicial = HOJE (sem isso, painel carrega 2657 notas históricas)
  const today = new Date();
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({
    label: 'Hoje',
    from: today,
    to: today,
  });

  const refresh = async () => {
    try {
      setError(null);
      const data = await api.getInvoices();
      setInvoices(data.invoices);
    } catch (e: any) {
      console.error('Erro ao buscar invoices:', e);
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Health check inicial pra detectar dry-run
  useEffect(() => {
    api.health().then(h => setDryRun(!!h.dryRun)).catch(() => {});
  }, []);

  // Fetch inicial + auto-refresh
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── Mutações otimistas: atualiza UI imediato + chama backend ─

  const approveInvoice = async (id: string, user: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    const prev = invoices;
    setInvoices(p => p.map(x => x.id === id ? { ...x, status: 'aprovada', aprovadoPor: user, aprovadoEm: new Date().toISOString() } : x));
    try {
      await api.approve(inv.chaveAcesso, { user, execId: (inv as any).execId });
    } catch (e: any) {
      console.error('Erro approve:', e);
      setInvoices(prev);
      alert(`Erro ao aprovar: ${e.message}`);
    }
  };

  const denyInvoice = async (id: string, motivo: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    const prev = invoices;
    // user real virá do Firebase token no backend; aqui só atualiza UI otimisticamente
    setInvoices(p => p.map(x => x.id === id ? { ...x, status: 'negada', erroMsg: motivo, aprovadoEm: new Date().toISOString() } : x));
    try {
      await api.deny(inv.chaveAcesso, { execId: (inv as any).execId, motivo });
    } catch (e: any) {
      console.error('Erro deny:', e);
      setInvoices(prev);
      alert(`Erro ao negar: ${e.message}`);
    }
  };

  const bulkApproveInvoices = async (ids: string[], user: string) => {
    await Promise.all(ids.map(id => approveInvoice(id, user)));
  };

  const emitInvoice = (id: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          status: 'emitida',
          emitidoEm: new Date().toISOString(),
          cteNumero: `${Math.floor(Math.random() * 10000)}`,
          cteChave: `local-mock-${Date.now()}`,
        };
      }
      return inv;
    }));
  };

  const addNoteToInvoice = (id: string, noteText: string, user: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const newNote = {
          id: Math.random().toString(36).substr(2, 9),
          text: noteText,
          date: new Date().toISOString(),
          user,
        };
        return { ...inv, notasInternas: [...(inv.notasInternas || []), newNote] };
      }
      return inv;
    }));
  };

  const snoozeInvoice = (id: string, date: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, snoozeUntil: date } : inv));
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
  };

  return (
    <InvoiceContext.Provider value={{
      invoices, loading, error, refresh, dryRun,
      approveInvoice, denyInvoice, emitInvoice, bulkApproveInvoices,
      addNoteToInvoice, snoozeInvoice, updateInvoice,
      globalDateRange, setGlobalDateRange,
    }}>
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoices = () => {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error('useInvoices must be used within an InvoiceProvider');
  return ctx;
};
