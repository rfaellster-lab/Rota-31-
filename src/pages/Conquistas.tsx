/**
 * @file Conquistas.tsx
 * @description Page /conquistas — galeria de achievements.
 *              Mostra todos os 15 do catálogo: unlocked colorido, locked esmaecido.
 *              Secretos só mostram nome após unlock.
 *              Gated por feature flag XP_ENABLED.
 *
 * @story Sprint 3 P3 / Conquistas page
 * @agent @dev
 * @created 2026-05-13
 */
import { useMemo, useState, type FC } from 'react';
import { Lock, Trophy, Filter } from 'lucide-react';
import { useGamificationStore } from '../stores/useGamificationStore';
import { useFeatureFlags } from '../stores/useFeatureFlags';
import { ACHIEVEMENTS_CATALOG, RARITY_ORDER, type AchievementCatalogItem, type AchievementRarity } from '../lib/achievementsCatalog';
import { EmptyState } from '../components/molecules/EmptyState';

type FilterMode = 'all' | 'unlocked' | 'locked';

const RARITY_STYLES: Record<AchievementRarity, { ring: string; bg: string; label: string; labelBg: string }> = {
  common: { ring: 'ring-slate-300', bg: 'bg-slate-50', label: 'text-slate-700', labelBg: 'bg-slate-200' },
  rare: { ring: 'ring-blue-400', bg: 'bg-blue-50', label: 'text-blue-800', labelBg: 'bg-blue-200' },
  epic: { ring: 'ring-purple-400', bg: 'bg-purple-50', label: 'text-purple-800', labelBg: 'bg-purple-200' },
  legendary: {
    ring: 'ring-amber-400',
    bg: 'bg-gradient-to-br from-amber-50 to-rose-50',
    label: 'text-rose-900',
    labelBg: 'bg-gradient-to-r from-amber-200 to-rose-200',
  },
};

interface AchievementCardProps {
  item: AchievementCatalogItem;
  unlocked: boolean;
  unlockedAt?: number;
}

const AchievementCard: FC<AchievementCardProps> = ({ item, unlocked, unlockedAt }) => {
  const rs = RARITY_STYLES[item.rarity];
  const showSecret = item.secret && !unlocked;

  return (
    <div
      className={`relative flex flex-col items-center rounded-xl border p-4 text-center transition-all ${
        unlocked
          ? `${rs.bg} ring-2 ${rs.ring} shadow-sm`
          : 'border-slate-200 bg-slate-50/60 opacity-60'
      }`}
    >
      <span className="absolute right-2 top-2">
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${rs.labelBg} ${rs.label}`}>
          {item.rarity}
        </span>
      </span>

      <span
        className={`mb-2 text-4xl ${unlocked ? '' : 'grayscale'}`}
        aria-hidden
      >
        {showSecret ? '🔒' : item.emoji}
      </span>

      <h3 className="text-sm font-semibold text-slate-900">
        {showSecret ? '???' : item.label}
      </h3>

      <p className="mt-0.5 text-xs text-slate-600">
        {showSecret
          ? 'Secreto — desbloqueie pra revelar'
          : unlocked
            ? item.description
            : item.hint || item.description}
      </p>

      {unlocked && unlockedAt && (
        <div className="mt-2 text-[10px] text-slate-400">
          Desbloqueado em {new Date(unlockedAt).toLocaleDateString('pt-BR')}
        </div>
      )}

      {!unlocked && !showSecret && (
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-400">
          <Lock className="h-3 w-3" aria-hidden />
          Bloqueado
        </span>
      )}
    </div>
  );
};

const Conquistas: FC = () => {
  const xpEnabled = useFeatureFlags((s) => s.flags.XP_ENABLED);
  const badges = useGamificationStore((s) => s.badges);
  const [filter, setFilter] = useState<FilterMode>('all');

  const unlockedMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of badges) {
      m.set(b.id, b.unlockedAt);
    }
    return m;
  }, [badges]);

  const filtered = useMemo(() => {
    const all = [...ACHIEVEMENTS_CATALOG].sort((a, b) => {
      // Unlocked primeiro, depois por rarity
      const aU = unlockedMap.has(a.id);
      const bU = unlockedMap.has(b.id);
      if (aU !== bU) return aU ? -1 : 1;
      return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    });
    if (filter === 'all') return all;
    if (filter === 'unlocked') return all.filter((a) => unlockedMap.has(a.id));
    return all.filter((a) => !unlockedMap.has(a.id));
  }, [filter, unlockedMap]);

  const totalUnlocked = unlockedMap.size;
  const totalCatalog = ACHIEVEMENTS_CATALOG.length;
  const pct = totalCatalog > 0 ? (totalUnlocked / totalCatalog) * 100 : 0;

  if (!xpEnabled) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Lock}
          title="Conquistas em preview"
          description="Esta área será liberada em breve."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
              Conquistas
            </h1>
            <p className="text-xs text-slate-600">
              {totalUnlocked} de {totalCatalog} desbloqueadas ({pct.toFixed(0)}%)
            </p>
          </div>
          <div className="h-3 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 sm:w-48">
            <div
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" aria-hidden />
        {(['all', 'unlocked', 'locked'] as FilterMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setFilter(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === m
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {m === 'all' ? 'Todas' : m === 'unlocked' ? 'Desbloqueadas' : 'Bloqueadas'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nada por aqui"
          description={
            filter === 'unlocked'
              ? 'Você ainda não desbloqueou nenhuma conquista. Continue usando o painel.'
              : 'Tudo desbloqueado! Você é incrível.'
          }
        />
      ) : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <AchievementCard
              key={item.id}
              item={item}
              unlocked={unlockedMap.has(item.id)}
              unlockedAt={unlockedMap.get(item.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
};

export default Conquistas;
