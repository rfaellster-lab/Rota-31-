/**
 * @file GamificationDock.tsx
 * @description Dock fixed bottom-right mostrando XP/Level/Streak/Rank.
 *              Aparece só se feature flag XP_ENABLED ativa.
 *              Hidrata via /api/me/xp no mount + atualiza com reconcile pós-approve.
 *              Tom Talita: profissional, sem infantilizar.
 *
 *              Master plan §1.2 — Server-authoritative: cliente nunca calcula XP.
 *              Optimistic updates permitidos com reconcile silencioso.
 *
 * @story Sprint 2 / GamificationDock
 * @agent @dev
 * @created 2026-05-12
 */
import { useEffect, useState, type FC } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { useGamificationStore, type Rank as StoreRank } from '../../stores/useGamificationStore';
import { useFeatureFlags } from '../../stores/useFeatureFlags';
import { CountUp } from '../atoms/CountUp';
import { XPBar } from '../atoms/XPBar';
import { RankBadge, type Rank } from '../atoms/RankBadge';
import { StreakIndicator } from '../atoms/StreakIndicator';

const API_KEY = (import.meta as any).env?.VITE_API_KEY || '';
const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };
  try {
    const { auth } = await import('../../lib/firebase');
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // anon ok
  }
  return headers;
}

async function fetchGamification(): Promise<{
  totalXP: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  rank: Rank;
  streakDays: number;
  longestStreak: number;
} | null> {
  try {
    const r = await fetch(`${API_BASE}/me/xp`, { headers: await getAuthHeaders() });
    if (!r.ok) return null;
    const j = await r.json();
    return j.gamification || null;
  } catch (e) {
    console.warn('[GamificationDock] erro ao buscar XP:', e);
    return null;
  }
}

const POLL_INTERVAL_MS = 30_000;

export const GamificationDock: FC = () => {
  const xpFlagEnabled = useFeatureFlags((s) => s.flags.XP_ENABLED);
  const totalXP = useGamificationStore((s) => s.totalXP);
  const level = useGamificationStore((s) => s.level);
  const rank = useGamificationStore((s) => s.rank);
  const streakDays = useGamificationStore((s) => s.streakDays);
  const longestStreak = useGamificationStore((s) => s.longestStreak);
  const badges = useGamificationStore((s) => s.badges);
  const loaded = useGamificationStore((s) => s.loaded);
  const hydrate = useGamificationStore((s) => s.hydrate);

  const [expanded, setExpanded] = useState(false);
  const [currentLevelXp, setCurrentLevelXp] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(100);

  // Initial fetch + polling leve a cada 30s
  useEffect(() => {
    if (!xpFlagEnabled) return;
    let cancelled = false;

    const load = async () => {
      const data = await fetchGamification();
      if (cancelled || !data) return;
      hydrate({
        totalXP: data.totalXP,
        level: data.level,
        rank: data.rank as StoreRank,
        streakDays: data.streakDays,
        longestStreak: data.longestStreak,
      });
      setCurrentLevelXp(data.currentLevelXp);
      setNextLevelXp(data.nextLevelXp);
    };

    void load();
    const id = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [xpFlagEnabled, hydrate]);

  if (!xpFlagEnabled || !loaded) return null;

  return (
    <div
      role="region"
      aria-label="Dock de progresso"
      className="fixed bottom-4 right-4 z-40 hidden sm:block"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="gamification-dock-panel"
        className="group flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-lg transition-shadow hover:shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <Trophy className="h-3 w-3 text-amber-500" aria-hidden />
            <span>XP</span>
          </div>
          <CountUp value={totalXP} className="text-sm font-bold text-slate-900 dark:text-slate-100" />
        </div>
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
        <StreakIndicator days={streakDays} size="sm" />
      </button>

      {expanded && (
        <div
          id="gamification-dock-panel"
          className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Seu progresso</span>
            </div>
            <RankBadge rank={rank as Rank} size="sm" />
          </div>

          <XPBar
            current={currentLevelXp}
            total={nextLevelXp}
            level={level}
            rankColor={rank as Rank}
          />

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Total</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                <CountUp value={totalXP} />
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Streak</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {streakDays}d
              </div>
              {longestStreak > streakDays && (
                <div className="text-[8px] text-slate-400">recorde: {longestStreak}d</div>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Selos</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {badges.length}
              </div>
            </div>
          </div>

          {/* Hierarchy visual — 5 níveis com indicador */}
          <div className="mt-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500">Hierarquia</div>
            <div className="flex items-center justify-between gap-1">
              {(['junior', 'pleno', 'senior', 'master', 'lendario'] as Rank[]).map((r) => {
                const isCurrent = r === rank;
                const dotColor = {
                  junior: 'bg-slate-400',
                  pleno: 'bg-blue-500',
                  senior: 'bg-emerald-500',
                  master: 'bg-purple-500',
                  lendario: 'bg-gradient-to-r from-amber-400 to-rose-500',
                }[r];
                return (
                  <div key={r} className="flex flex-1 flex-col items-center gap-0.5">
                    <span
                      className={`h-2 w-2 rounded-full ${dotColor} ${isCurrent ? 'ring-2 ring-offset-1 ring-slate-700' : 'opacity-50'}`}
                      aria-hidden
                    />
                    <span className={`text-[9px] capitalize ${isCurrent ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                      {r}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-[10px] leading-tight text-slate-400">
            Ganhe XP aprovando, negando ou cancelando notas. Streak conta dias consecutivos com ações.
          </p>
        </div>
      )}
    </div>
  );
};
