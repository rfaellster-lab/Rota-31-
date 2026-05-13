/**
 * @file DashboardExecutivo.tsx
 * @description Page /executivo — 6 widgets pro Jader/Raphael (admin only).
 *              Lazy-loaded (não pesa no bundle inicial).
 *              Fetcha GET /api/executive/kpis.
 *
 *              Widgets:
 *              1. Volume (24h / 7d / 30d / total)
 *              2. Tempo médio de aprovação
 *              3. Top 10 clientes
 *              4. Distribuição de status (pizza/barras)
 *              5. Taxa de rejeição
 *              6. Trend últimas 4 semanas
 *
 * @story Sprint 2 P2 / DashboardExecutivo
 * @agent @dev
 * @created 2026-05-12
 */
import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Clock, Users, AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useFeatureFlags } from '../stores/useFeatureFlags';
import { Skeleton } from '../components/atoms/Skeleton';
import { CountUp } from '../components/atoms/CountUp';
import { EmptyState } from '../components/molecules/EmptyState';
import { useToast } from '../stores/useToastStore';

const API_KEY = (import.meta as any).env?.VITE_API_KEY || '';
const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

interface KpisData {
  ts: string;
  volume: { last24h: number; last7d: number; last30d: number; total: number };
  avgApprovalMin: number;
  topClientes: Array<{ nome: string; count: number; valorFrete: number }>;
  statusDist: Record<string, number>;
  rejeitionRate: number;
  trendWeeks: Array<{ week: string; count: number }>;
}

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'x-api-key': API_KEY };
  try {
    const { auth } = await import('../lib/firebase');
    if (auth.currentUser) {
      h['Authorization'] = `Bearer ${await auth.currentUser.getIdToken()}`;
    }
  } catch {}
  return h;
}

const STATUS_COLORS: Record<string, string> = {
  aprovada: 'bg-emerald-500',
  emitida: 'bg-emerald-600',
  pendente: 'bg-orange-400',
  negada: 'bg-rose-500',
  cancelada: 'bg-slate-500',
  denegada: 'bg-rose-700',
  erro: 'bg-rose-900',
};

const StatusBadge: FC<{ status: string; count: number; total: number }> = ({ status, count, total }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`h-3 w-3 rounded-full ${STATUS_COLORS[status] || 'bg-slate-300'}`} aria-hidden />
      <span className="flex-1 text-sm capitalize text-slate-700">{status}</span>
      <span className="text-sm font-semibold text-slate-900">{count}</span>
      <span className="w-12 text-right text-xs text-slate-500">{pct.toFixed(1)}%</span>
    </div>
  );
};

const DashboardExecutivo: FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const flagEnabled = useFeatureFlags((s) => s.flags.EXECUTIVE_DASHBOARD_ENABLED);
  const [data, setData] = useState<KpisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gate de acesso
  useEffect(() => {
    if (!isAdmin) {
      toast.warn('Área restrita aos administradores.');
      navigate('/');
    }
  }, [isAdmin, navigate, toast]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/executive/kpis`, { headers: await authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as KpisData;
      setData(j);
    } catch (e: any) {
      console.error('[executive] erro:', e);
      setError(e.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  if (!isAdmin) return null;

  if (!flagEnabled) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangle}
          variant="default"
          title="Dashboard Executivo em preview"
          description="Esta área será liberada em breve. Aguarde."
        />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton variant="rect" height={120} className="w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton variant="rect" height={200} className="w-full" />
          <Skeleton variant="rect" height={200} className="w-full" />
          <Skeleton variant="rect" height={200} className="w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <EmptyState
          variant="error"
          icon={AlertTriangle}
          title="Não conseguimos carregar agora"
          description={error || 'Backend indisponível.'}
          action={
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Tentar de novo
            </button>
          }
        />
      </div>
    );
  }

  const statusTotal = Object.values(data.statusDist).reduce((s, n) => s + n, 0);
  const maxTrend = Math.max(1, ...data.trendWeeks.map((w) => w.count));

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard Executivo</h1>
          <p className="text-xs text-slate-500">Atualizado em {new Date(data.ts).toLocaleString('pt-BR')}</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Atualizar
        </button>
      </header>

      {/* Widget 1: Volume */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: '24 horas', value: data.volume.last24h },
          { label: '7 dias', value: data.volume.last7d },
          { label: '30 dias', value: data.volume.last30d },
          { label: 'Total', value: data.volume.total },
        ].map((w) => (
          <div key={w.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{w.label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              <CountUp value={w.value} />
            </div>
            <div className="mt-0.5 text-xs text-slate-500">notas processadas</div>
          </div>
        ))}
      </section>

      {/* Widgets 2 + 5: Tempo médio + Taxa rejeição */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Clock className="h-3 w-3" aria-hidden />
            Tempo médio de aprovação
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            <CountUp value={data.avgApprovalMin} /> <span className="text-base font-medium text-slate-500">min</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Meta: &lt; 30 min — {data.avgApprovalMin <= 30 ? '✅ no alvo' : '⚠️ acima da meta'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Taxa de rejeição
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            <CountUp value={data.rejeitionRate} /> <span className="text-base font-medium text-slate-500">%</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            negadas + canceladas / total decididas
          </div>
        </div>
      </section>

      {/* Widget 3: Top clientes + Widget 4: Status distribution */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Users className="h-3 w-3" aria-hidden />
            Top 10 clientes (volume)
          </div>
          {data.topClientes.length === 0 ? (
            <p className="text-xs text-slate-400">Sem dados.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.topClientes.map((c) => (
                <li key={c.nome} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-700">{c.nome}</span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {c.count} <span className="text-xs font-normal text-slate-400">· {BRL(c.valorFrete)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <BarChart3 className="h-3 w-3" aria-hidden />
            Distribuição por status
          </div>
          <div className="space-y-2">
            {Object.entries(data.statusDist)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <StatusBadge key={status} status={status} count={count} total={statusTotal} />
              ))}
          </div>
        </div>
      </section>

      {/* Widget 6: Trend semanas */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <TrendingUp className="h-3 w-3" aria-hidden />
          Tendência — últimas 4 semanas
        </div>
        <div className="flex h-32 items-end justify-between gap-3">
          {data.trendWeeks.map((w, idx) => {
            const h = (w.count / maxTrend) * 100;
            const isLast = idx === data.trendWeeks.length - 1;
            return (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-xs font-semibold text-slate-900">{w.count}</div>
                <div
                  className={`w-full rounded-t transition-all duration-500 ${isLast ? 'bg-[#F26522]' : 'bg-slate-300'}`}
                  style={{ height: `${h}%` }}
                  aria-hidden
                />
                <div className="text-[10px] text-slate-500">{w.week}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          {data.trendWeeks.length >= 2 &&
            data.trendWeeks[data.trendWeeks.length - 1].count >
              data.trendWeeks[data.trendWeeks.length - 2].count ? (
            <>
              <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden />
              <span>Crescendo vs semana anterior</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-amber-600" aria-hidden />
              <span>Queda vs semana anterior</span>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardExecutivo;
