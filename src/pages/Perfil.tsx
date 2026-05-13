/**
 * @file Perfil.tsx
 * @description Page /perfil — carteira do operador + stats consolidadas.
 *              Mostra dados do useAuth + useGamificationStore.
 *              Histórico XP via GET /api/me/events (silent fail se backend off).
 *              Gated por XP_ENABLED.
 *
 *              Princípio governamental #1 (master-plan): "Carteira de identidade"
 *              é um marcador permanente. ROTA31-2024-XXXX dá pertencimento.
 *
 * @story Sprint 3 P4 / Page Perfil
 * @agent @dev
 * @created 2026-05-13
 */
import { useEffect, useState, type FC } from 'react';
import { Trophy, Flame, Sparkles, Calendar, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useGamificationStore } from '../stores/useGamificationStore';
import { useFeatureFlags } from '../stores/useFeatureFlags';
import { api } from '../services/api';
import { CountUp } from '../components/atoms/CountUp';
import { XPBar } from '../components/atoms/XPBar';
import { RankBadge, type Rank } from '../components/atoms/RankBadge';
import { StreakIndicator } from '../components/atoms/StreakIndicator';
import { Skeleton } from '../components/atoms/Skeleton';
import { EmptyState } from '../components/molecules/EmptyState';
import { ACHIEVEMENTS_CATALOG, findAchievement } from '../lib/achievementsCatalog';

interface EventLogItem {
  id: string;
  type: string;
  amount: number;
  reason?: string;
  ts: any;
}

const formatDate = (ts: any): string => {
  try {
    if (!ts) return '';
    if (typeof ts === 'string') return new Date(ts).toLocaleDateString('pt-BR');
    if (typeof ts === 'number') return new Date(ts).toLocaleDateString('pt-BR');
    if (ts._seconds) return new Date(ts._seconds * 1000).toLocaleDateString('pt-BR');
    return '';
  } catch {
    return '';
  }
};

const EVENT_LABELS: Record<string, string> = {
  invoice_approved: 'Nota aprovada',
  invoice_denied: 'Nota negada',
  invoice_cancelled: 'CT-e cancelado',
  invoice_with_alert_resolved: 'Alerta resolvido',
  bulk_approve: 'Aprovação em lote',
  note_added: 'Nota interna',
  first_action_of_day: 'Primeira ação do dia',
  backfill: 'XP retroativo',
};

const Perfil: FC = () => {
  const { user, isAdmin } = useAuth();
  const xpEnabled = useFeatureFlags((s) => s.flags.XP_ENABLED);
  const totalXP = useGamificationStore((s) => s.totalXP);
  const level = useGamificationStore((s) => s.level);
  const rank = useGamificationStore((s) => s.rank);
  const streakDays = useGamificationStore((s) => s.streakDays);
  const longestStreak = useGamificationStore((s) => s.longestStreak);
  const badges = useGamificationStore((s) => s.badges);

  const [events, setEvents] = useState<EventLogItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsAvail, setEventsAvail] = useState(true);
  const [carteiraId, setCarteiraId] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      const r = await api.getMyProfile();
      if (r.profile?.carteiraId) setCarteiraId(r.profile.carteiraId);
      if (r.profile?.joinedAt) setJoinedAt(r.profile.joinedAt);
    } catch {
      // backend pode estar off
    }
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const r = await api.getMyEvents();
      setEvents(r.events || []);
      setEventsAvail(true);
    } catch {
      setEventsAvail(false);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (xpEnabled) {
      void loadProfile();
      void loadEvents();
    }
  }, [xpEnabled]);

  if (!xpEnabled) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Lock}
          title="Perfil em preview"
          description="Esta área será liberada em breve."
        />
      </div>
    );
  }

  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();
  const label = user?.displayName || user?.email || 'Usuário';
  const carteira = carteiraId || (user?.uid ? `ROTA31-${new Date().getFullYear()}-${user.uid.slice(0, 6).toUpperCase()}` : '—');
  const unlockedCount = badges.length;

  // XP info pra barra (calcular manualmente — o store não persiste currentLevelXp)
  // Fórmula: xpToLevel(n) = 50n^2 + 50n
  const xpToLevel = (n: number) => 50 * n * n + 50 * n;
  const prevXp = level > 1 ? xpToLevel(level - 1) : 0;
  const nextXp = xpToLevel(level);
  const currentLevelXp = totalXP - prevXp;
  const nextLevelXp = nextXp - prevXp;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header com carteira */}
      <header className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F26522] to-orange-600 text-3xl font-bold text-white shadow-lg">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{label}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <RankBadge rank={rank as Rank} size="sm" />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Nível {level}
              </span>
              {isAdmin && (
                <span className="rounded-full bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-800 dark:text-purple-300">
                  Admin
                </span>
              )}
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Carteira</span>
              <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{carteira}</span>
            </div>
            {joinedAt && (
              <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                Operador desde {new Date(joinedAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <XPBar
            current={currentLevelXp}
            total={nextLevelXp}
            level={level}
            rankColor={rank as Rank}
          />
        </div>
      </header>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Trophy className="h-3 w-3" aria-hidden />
            Total XP
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <CountUp value={totalXP} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Flame className="h-3 w-3" aria-hidden />
            Streak
          </div>
          <div className="mt-1 flex items-center gap-2">
            <StreakIndicator days={streakDays} size="md" />
          </div>
          {longestStreak > 0 && (
            <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Recorde: {longestStreak} dias
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Sparkles className="h-3 w-3" aria-hidden />
            Selos
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {unlockedCount}
            <span className="ml-1 text-base font-normal text-slate-400">
              / {ACHIEVEMENTS_CATALOG.length}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Calendar className="h-3 w-3" aria-hidden />
            Próximo nível
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
            {nextLevelXp - currentLevelXp}
            <span className="ml-1 text-xs font-normal text-slate-500">XP</span>
          </div>
        </div>
      </section>

      {/* Badges desbloqueadas (top 6) */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Suas conquistas</h2>
          <a
            href="/conquistas"
            className="text-xs font-medium text-[#F26522] hover:underline"
          >
            Ver todas →
          </a>
        </div>
        {badges.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Você ainda não desbloqueou nenhuma. Continue usando o painel.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, 6).map((b) => {
              const catalog = findAchievement(b.id);
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-1.5"
                  title={catalog?.description || b.id}
                >
                  <span className="text-lg" aria-hidden>{catalog?.emoji || '🏅'}</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {catalog?.label || b.id}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Histórico XP */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Histórico recente</h2>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            aria-label="Recarregar"
          >
            <RefreshCw className={`h-3 w-3 ${eventsLoading ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </div>
        {eventsLoading ? (
          <div className="space-y-2">
            <Skeleton variant="row" />
            <Skeleton variant="row" />
            <Skeleton variant="row" />
          </div>
        ) : !eventsAvail ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Histórico indisponível no momento.
          </p>
        ) : events.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sem eventos ainda.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {events.slice(0, 10).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    {EVENT_LABELS[e.type] || e.type}
                  </div>
                  {e.reason && (
                    <div className="text-[10px] text-slate-400">{e.reason}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    +{e.amount} XP
                  </span>
                  <span className="text-[10px] text-slate-400">{formatDate(e.ts)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Perfil;
