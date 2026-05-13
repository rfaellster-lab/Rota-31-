/**
 * @file Loja.tsx
 * @description Page /loja — catálogo Loja XP + resgate.
 *              Lazy-loaded. Gated por feature flag STORE_ENABLED.
 *              Tom Talita: profissional, sem infantilizar.
 *
 * @story Sprint 3 P1 / Loja XP
 * @agent @dev
 * @created 2026-05-13
 */
import { useEffect, useState, type FC } from 'react';
import { Lock, Sparkles, Check, RefreshCw, AlertOctagon, ShoppingBag } from 'lucide-react';
import { api } from '../services/api';
import { useFeatureFlags } from '../stores/useFeatureFlags';
import { useGamificationStore } from '../stores/useGamificationStore';
import { useToast } from '../stores/useToastStore';
import { Skeleton } from '../components/atoms/Skeleton';
import { CountUp } from '../components/atoms/CountUp';
import { EmptyState } from '../components/molecules/EmptyState';
import { analytics } from '../lib/analytics';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface StoreItem {
  id: string;
  title: string;
  description: string;
  costXP: number;
  kind: 'cosmetic' | 'boost' | 'badge' | 'mystery';
  rarity: Rarity;
  emoji: string;
  minLevel?: number;
  consumable?: boolean;
  available: boolean;
}

const RARITY_STYLES: Record<Rarity, { border: string; bg: string; tag: string }> = {
  common: { border: 'border-slate-300', bg: 'bg-white', tag: 'bg-slate-100 text-slate-700' },
  rare: { border: 'border-blue-300', bg: 'bg-blue-50/40', tag: 'bg-blue-100 text-blue-800' },
  epic: { border: 'border-purple-400', bg: 'bg-purple-50/40', tag: 'bg-purple-100 text-purple-800' },
  legendary: {
    border: 'border-amber-400',
    bg: 'bg-gradient-to-br from-amber-50/60 to-rose-50/60',
    tag: 'bg-gradient-to-r from-amber-200 to-rose-200 text-rose-900',
  },
};

const Loja: FC = () => {
  const flagEnabled = useFeatureFlags((s) => s.flags.STORE_ENABLED);
  const totalXP = useGamificationStore((s) => s.totalXP);
  const reconcile = useGamificationStore((s) => s.reconcile);
  const toast = useToast();

  const [items, setItems] = useState<StoreItem[]>([]);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([
        api.getStoreItems(),
        api.getMyPurchases().catch(() => ({ purchases: [], count: 0 })),
      ]);
      setItems(s.items);
      setLevel(s.level);
      setPurchasedIds(new Set(p.purchases.map((x: any) => x.itemId)));
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (flagEnabled) void load();
  }, [flagEnabled]);

  const handleRedeem = async (item: StoreItem) => {
    if (redeeming) return;
    if (totalXP < item.costXP) {
      toast.warn(`XP insuficiente: ${totalXP} / ${item.costXP}`);
      return;
    }
    if (!confirm(`Resgatar "${item.title}" por ${item.costXP} XP?`)) return;
    setRedeeming(item.id);
    try {
      const r = await api.redeemStoreItem(item.id);
      if (!r.ok) {
        toast.error(r.error || 'Não foi possível resgatar');
        return;
      }
      if (typeof r.newTotalXP === 'number') {
        // Reconcile XP
        const gam = useGamificationStore.getState();
        reconcile({ totalXP: r.newTotalXP, level: gam.level, rank: gam.rank });
      }
      if (r.mysteryReward) {
        toast.success(`${r.mysteryReward.label} 🎁`, { title: 'Caixa misteriosa!' });
      } else {
        toast.success(`"${item.title}" desbloqueado!`, { title: '✅ Resgatado' });
      }
      analytics.storeRedeem({ itemId: item.id, costXP: item.costXP, rarity: item.rarity });
      if (!item.consumable) {
        setPurchasedIds((s) => new Set(s).add(item.id));
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message || e}`);
    } finally {
      setRedeeming(null);
    }
  };

  if (!flagEnabled) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Lock}
          title="Loja em preview"
          description="Esta área será liberada em breve."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton variant="rect" height={80} className="w-full" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={160} className="w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          variant="error"
          icon={AlertOctagon}
          title="Erro ao carregar loja"
          description={error}
          action={
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Tentar de novo
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4 sm:p-6">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <ShoppingBag className="h-5 w-5 text-[#F26522]" aria-hidden />
              Loja XP
            </h1>
            <p className="text-xs text-slate-600">Gaste seu XP em recompensas. Nada some — XP é só pra trocar.</p>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-white px-4 py-2 shadow-sm">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Seu XP</div>
              <div className="text-lg font-bold text-slate-900"><CountUp value={totalXP} /></div>
            </div>
            <div className="h-8 w-px bg-slate-200" aria-hidden />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Nível</div>
              <div className="text-lg font-bold text-slate-900">{level}</div>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const rs = RARITY_STYLES[item.rarity];
          const owned = purchasedIds.has(item.id);
          const canAfford = totalXP >= item.costXP;
          const disabled = redeeming === item.id || (owned && !item.consumable);
          return (
            <div
              key={item.id}
              className={`relative flex flex-col rounded-xl border ${rs.border} ${rs.bg} p-4 transition-shadow hover:shadow-md`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-3xl" aria-hidden>{item.emoji}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${rs.tag}`}>
                  {item.rarity}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-0.5 flex-1 text-xs text-slate-600">{item.description}</p>

              <div className="mt-3 flex items-center justify-between">
                <span className={`text-sm font-bold ${canAfford ? 'text-slate-900' : 'text-slate-400'}`}>
                  {item.costXP.toLocaleString('pt-BR')} XP
                </span>
                {owned && !item.consumable ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <Check className="h-3 w-3" aria-hidden />
                    Possuído
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRedeem(item)}
                    disabled={disabled || !canAfford}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      canAfford
                        ? 'bg-[#F26522] text-white hover:bg-orange-600'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {redeeming === item.id ? 'Resgatando…' : <>
                      <Sparkles className="h-3 w-3" aria-hidden />
                      Resgatar
                    </>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <footer className="text-center text-[10px] text-slate-400">
        Estamos começando a Loja com itens digitais. Mais virão com base no que você usar mais.
      </footer>
    </div>
  );
};

export default Loja;
