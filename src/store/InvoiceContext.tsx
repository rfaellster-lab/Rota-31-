/**
 * @file InvoiceContext.tsx
 * @description State global do painel — agora conectado ao backend real
 * @updated 2026-04-29 — substituído mockData por fetch /api/invoices
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Invoice } from '../types';
import { DateRange } from '../components/DateRangePicker';
import { api } from '../services/api';
import { useToastStore } from '../stores/useToastStore';
import { useGamificationStore } from '../stores/useGamificationStore';
import { useBadgeUnlockStore } from '../stores/useBadgeUnlockStore';
import { useConfettiStore } from '../stores/useConfettiStore';
import { analytics } from '../lib/analytics';
import { notifyComboBump } from '../lib/useComboTracker';

// Helper: dispara toast fora de componente (Context Provider)
type ToastOpts = { title?: string; durationMs?: number };
const toast = {
  error: (message: string, opts?: ToastOpts) =>
    useToastStore.getState().push({ level: 'error', message, durationMs: opts?.durationMs ?? 6000, ...opts }),
  warn: (message: string, opts?: ToastOpts) =>
    useToastStore.getState().push({ level: 'warn', message, durationMs: opts?.durationMs ?? 5000, ...opts }),
  success: (message: string, opts?: ToastOpts) =>
    useToastStore.getState().push({ level: 'success', message, durationMs: opts?.durationMs ?? 4000, ...opts }),
};

interface InvoiceContextType {
  invoices: Invoice[];
  loading: boolean;
  refreshing: boolean;
  lastUpdated: number | null;
  error: string | null;
  refresh: () => Promise<void>;
  approveInvoice: (
    id: string,
    user: string,
    opts?: { valorFreteOverride?: number; motivoOverride?: string }
  ) => Promise<void>;
  denyInvoice: (id: string, motivo: string) => Promise<void>;
  cancelInvoice: (id: string, motivo: string) => Promise<void>;
  emitInvoice: (id: string) => void;
  bulkApproveInvoices: (ids: string[], user: string) => Promise<void>;
  addNoteToInvoice: (id: string, noteText: string, user: string) => Promise<void>;
  snoozeInvoice: (id: string, date: string) => Promise<void>;
  loadInvoiceNotes: (chave: string) => Promise<Array<{ id: string; text: string; user: string; date: string }>>;
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);

  // Filtro inicial = HOJE (persiste em localStorage)
  const today = new Date();
  const [globalDateRange, _setGlobalDateRange] = useState<DateRange>(() => {
    try {
      const raw = localStorage.getItem('rota31:dateRange');
      if (raw) {
        const o = JSON.parse(raw);
        return {
          label: o.label || 'Hoje',
          from: o.from ? new Date(o.from) : today,
          to: o.to ? new Date(o.to) : today,
        };
      }
    } catch {}
    return { label: 'Hoje', from: today, to: today };
  });
  const setGlobalDateRange = (r: DateRange) => {
    _setGlobalDateRange(r);
    try {
      localStorage.setItem('rota31:dateRange', JSON.stringify({ label: r.label, from: r.from, to: r.to }));
    } catch {}
  };

  // Estado pra evitar toast spam: só avisa uma vez por sessão de falha contínua.
  // Lição 2026-05-12: silent fail aqui causou 4 dias de painel cego sem ninguém notar.
  let refreshFailedNotified = false;

  const refresh = async () => {
    try {
      setError(null);
      setRefreshing(true);
      const data = await api.getInvoices();
      setInvoices(data.invoices);
      setLastUpdated(Date.now());
      refreshFailedNotified = false; // reset se voltou a funcionar
    } catch (e: any) {
      console.error('Erro ao buscar invoices:', e);
      setError(e.message || 'Erro ao carregar dados');
      if (!refreshFailedNotified) {
        refreshFailedNotified = true;
        toast.error(
          `Não conseguimos buscar as notas. ${e?.message || 'Verifique sua conexão.'} O BackendStatusBanner no topo mostra mais detalhes.`
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const approveInvoice = async (
    id: string,
    user: string,
    opts?: { valorFreteOverride?: number; motivoOverride?: string }
  ) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    const prev = invoices;
    setInvoices(p => p.map(x => x.id === id ? {
      ...x,
      status: 'aprovada',
      aprovadoPor: user,
      aprovadoEm: new Date().toISOString(),
      valorFrete: opts?.valorFreteOverride ?? x.valorFrete,
    } : x));

    // Sprint 2 — Optimistic XP (+10 ish) com reconcile pós-response
    const optimisticId = useGamificationStore.getState().pushOptimistic({ amount: 10, reason: 'aguardando' });
    try {
      const r = await api.approve(inv.chaveAcesso, { user, execId: (inv as any).execId, ...opts });
      useGamificationStore.getState().removeOptimistic(optimisticId);
      // Analytics
      analytics.invoiceApproved({ chave: inv.chaveAcesso, xpGained: r?.xp?.gained, hadAlert: !!inv.temAlerta });

      // Sprint 3 P2 — Combo tracker (toast visual em milestones 3/5/10/20/50)
      notifyComboBump(toast as any);

      // Reconcile com XP real do server
      if (r?.xp && typeof r.xp.newTotalXP === 'number') {
        useGamificationStore.getState().reconcile({
          totalXP: r.xp.newTotalXP,
          level: r.xp.level,
          rank: r.xp.rank,
        });
        // Notifica se subiu de nível ou rank
        if (r.xp.leveledUp) {
          toast.success(`Nível ${r.xp.level} desbloqueado!`, { title: '🎯 Level up' });
          analytics.levelUp({ newLevel: r.xp.level, totalXP: r.xp.newTotalXP });
          useConfettiStore.getState().trigger(2500); // Confetti no level up
        } else if (r.xp.rankedUp) {
          toast.success(`Você é ${r.xp.rank} agora`, { title: '⭐ Rank up' });
          analytics.rankUp({ newRank: r.xp.rank, level: r.xp.level });
          useConfettiStore.getState().trigger(3500); // Confetti maior no rank up
        } else if (r.xp.isRare) {
          toast.success(`Sorte: ${r.xp.reason} (+${r.xp.gained} XP)`, { title: '✨ Bônus raro' });
        }
        // Achievements novos → fila de BadgeUnlockToast (+ confetti se legendary)
        if (Array.isArray(r.xp.newAchievements) && r.xp.newAchievements.length > 0) {
          useBadgeUnlockStore.getState().push(r.xp.newAchievements);
          r.xp.newAchievements.forEach((b: any) => {
            analytics.achievementUnlocked({ id: b.id, rarity: b.rarity });
            if (b.rarity === 'legendary') useConfettiStore.getState().trigger(4000);
          });
        }
      }
    } catch (e: any) {
      console.error('Erro approve:', e);
      setInvoices(prev);
      useGamificationStore.getState().removeOptimistic(optimisticId);
      toast.error(`Erro ao aprovar: ${e.message}`);
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
      toast.error(`Erro ao negar: ${e.message}`);
    }
  };

  const cancelInvoice = async (id: string, motivo: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    if (!motivo || motivo.trim().length < 3) {
      toast.warn('Informe o motivo do cancelamento (mínimo 3 caracteres)');
      return;
    }
    const prev = invoices;
    setInvoices(p => p.map(x => x.id === id ? { ...x, status: 'cancelada', erroMsg: motivo } : x));
    try {
      const r = await api.cancelInvoice(inv.chaveAcesso, { motivo });
      if (r.aviso) console.info('Cancelamento:', r.aviso);
    } catch (e: any) {
      console.error('Erro cancel:', e);
      setInvoices(prev);
      toast.error(`Erro ao cancelar: ${e.message}`);
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

  const addNoteToInvoice = async (id: string, noteText: string, user: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    // Otimista
    const tempNote = { id: 'tmp-' + Date.now(), text: noteText, date: new Date().toISOString(), user };
    setInvoices(prev => prev.map(x => x.id === id ? { ...x, notasInternas: [...(x.notasInternas || []), tempNote] } : x));
    try {
      await api.addInvoiceNote(inv.chaveAcesso, noteText);
    } catch (e: any) {
      console.error('Erro salvar nota:', e);
      toast.error('Erro ao salvar nota: ' + e.message);
    }
  };

  const loadInvoiceNotes = async (chave: string) => {
    try {
      const r = await api.listInvoiceNotes(chave);
      // Sincroniza no state
      setInvoices(prev => prev.map(x => x.chaveAcesso === chave ? { ...x, notasInternas: r.notes } : x));
      return r.notes;
    } catch (e: any) {
      console.error('Erro listar notas:', e);
      return [];
    }
  };

  const snoozeInvoice = async (id: string, date: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    setInvoices(prev => prev.map(x => x.id === id ? { ...x, snoozeUntil: date } : x));
    try {
      await api.setInvoiceSnooze(inv.chaveAcesso, date);
    } catch (e: any) {
      console.error('Erro snooze:', e);
      toast.error('Erro ao adiar: ' + e.message);
    }
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
  };

  return (
    <InvoiceContext.Provider value={{
      invoices, loading, refreshing, lastUpdated, error, refresh, dryRun,
      approveInvoice, denyInvoice, cancelInvoice, emitInvoice, bulkApproveInvoices,
      addNoteToInvoice, snoozeInvoice, loadInvoiceNotes, updateInvoice,
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
