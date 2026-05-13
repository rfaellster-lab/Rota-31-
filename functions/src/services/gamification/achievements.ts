/**
 * @file achievements.ts
 * @description Engine declarativo de achievements (conquistas).
 *              Cada achievement tem um id, target, e um predicate sobre estado.
 *              Hook: chamado dentro de creditXp() pra detectar unlocks novos.
 *
 *              10 achievements iniciais — Sprint 2. Mais em Sprint 3 (loja, secretos).
 *
 * @story Sprint 2 P2 / Achievements
 * @agent @dev
 * @created 2026-05-12
 */

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  label: string;
  description: string;
  rarity: AchievementRarity;
  // metric source: gamification state + action context
  /** Função pura — retorna true se achievement deve estar desbloqueado */
  isUnlocked: (state: AchievementState) => boolean;
}

export interface AchievementState {
  totalXP: number;
  level: number;
  streakDays: number;
  longestStreak: number;
  /** Contadores totais por action */
  counts: {
    invoice_approved: number;
    invoice_denied: number;
    invoice_cancelled: number;
    invoice_with_alert_resolved: number;
    note_added: number;
  };
  /** Hora atual (BRT) — usada por achievements relacionados a horário */
  currentHour?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Onboarding (common)
  {
    id: 'first_approval',
    label: 'Primeira decisão',
    description: 'Aprovou a primeira nota',
    rarity: 'common',
    isUnlocked: (s) => s.counts.invoice_approved >= 1,
  },
  {
    id: 'first_streak_3',
    label: 'Engajada',
    description: '3 dias consecutivos no painel',
    rarity: 'common',
    isUnlocked: (s) => s.longestStreak >= 3,
  },
  // Maestria — volume (common → rare)
  {
    id: 'volume_100',
    label: 'Cem decisões',
    description: 'Aprovou 100 notas',
    rarity: 'common',
    isUnlocked: (s) => s.counts.invoice_approved >= 100,
  },
  {
    id: 'volume_500',
    label: 'Meio milhão',
    description: 'Aprovou 500 notas',
    rarity: 'rare',
    isUnlocked: (s) => s.counts.invoice_approved >= 500,
  },
  {
    id: 'volume_1000',
    label: 'Milheira',
    description: 'Aprovou 1.000 notas',
    rarity: 'epic',
    isUnlocked: (s) => s.counts.invoice_approved >= 1000,
  },
  // Streaks
  {
    id: 'streak_7',
    label: 'Semana cheia',
    description: '7 dias consecutivos',
    rarity: 'rare',
    isUnlocked: (s) => s.longestStreak >= 7,
  },
  {
    id: 'streak_30',
    label: 'Mês completo',
    description: '30 dias consecutivos',
    rarity: 'epic',
    isUnlocked: (s) => s.longestStreak >= 30,
  },
  // Critério (resolver alertas)
  {
    id: 'careful_10',
    label: 'Atenta',
    description: 'Resolveu 10 notas com alerta',
    rarity: 'rare',
    isUnlocked: (s) => s.counts.invoice_with_alert_resolved >= 10,
  },
  // Hidden / hour-based
  {
    id: 'midnight_owl',
    label: 'Coruja',
    description: 'Aprovou notas entre 22h-5h',
    rarity: 'rare',
    isUnlocked: (s) =>
      s.counts.invoice_approved >= 1 &&
      typeof s.currentHour === 'number' &&
      (s.currentHour >= 22 || s.currentHour <= 4),
  },
  {
    id: 'early_bird',
    label: 'Madrugadora',
    description: 'Aprovou notas entre 5h-7h',
    rarity: 'rare',
    isUnlocked: (s) =>
      s.counts.invoice_approved >= 1 &&
      typeof s.currentHour === 'number' &&
      s.currentHour >= 5 && s.currentHour <= 7,
  },
];

/**
 * Recebe estado novo + lista de IDs já desbloqueados antes, retorna IDs NOVOS desbloqueados.
 */
export function detectNewUnlocks(
  state: AchievementState,
  alreadyUnlocked: Set<string>,
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlocked.has(a.id) && a.isUnlocked(state),
  );
}

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
