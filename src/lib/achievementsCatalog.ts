/**
 * @file achievementsCatalog.ts
 * @description Catálogo client-side dos achievements — espelha o backend
 *              em `functions/src/services/gamification/achievements.ts`.
 *              Usado pela Page /conquistas pra mostrar locked + unlocked.
 *              Backend é source-of-truth pro unlock; este arquivo é só display.
 *
 *              Manter SINCRONIZADO com backend. Próxima evolução:
 *              gerar de uma única definição via tooling.
 *
 * @story Sprint 3 P3 / Conquistas page
 * @agent @dev
 * @created 2026-05-13
 */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementCatalogItem {
  id: string;
  label: string;
  description: string;
  rarity: AchievementRarity;
  /** Hint visual sobre como desbloquear */
  hint?: string;
  /** Achievement é secreto? — não mostra label/desc até unlock */
  secret?: boolean;
  emoji: string;
  category: 'onboarding' | 'volume' | 'streak' | 'critério' | 'horário' | 'secret';
}

export const ACHIEVEMENTS_CATALOG: AchievementCatalogItem[] = [
  // Onboarding
  {
    id: 'first_approval',
    label: 'Primeira decisão',
    description: 'Aprovou a primeira nota',
    rarity: 'common',
    emoji: '✅',
    category: 'onboarding',
  },
  {
    id: 'first_streak_3',
    label: 'Engajada',
    description: '3 dias consecutivos no painel',
    rarity: 'common',
    hint: 'Volte ao painel 3 dias seguidos',
    emoji: '🔥',
    category: 'streak',
  },
  // Volume
  {
    id: 'volume_100',
    label: 'Cem decisões',
    description: 'Aprovou 100 notas',
    rarity: 'common',
    hint: '100 aprovações',
    emoji: '💯',
    category: 'volume',
  },
  {
    id: 'volume_500',
    label: 'Meio milhão',
    description: 'Aprovou 500 notas',
    rarity: 'rare',
    hint: '500 aprovações',
    emoji: '🎯',
    category: 'volume',
  },
  {
    id: 'volume_1000',
    label: 'Milheira',
    description: 'Aprovou 1.000 notas',
    rarity: 'epic',
    hint: '1.000 aprovações',
    emoji: '🏆',
    category: 'volume',
  },
  // Streaks
  {
    id: 'streak_7',
    label: 'Semana cheia',
    description: '7 dias consecutivos',
    rarity: 'rare',
    hint: '7 dias seguidos',
    emoji: '📅',
    category: 'streak',
  },
  {
    id: 'streak_30',
    label: 'Mês completo',
    description: '30 dias consecutivos',
    rarity: 'epic',
    hint: '30 dias seguidos',
    emoji: '🗓️',
    category: 'streak',
  },
  // Critério
  {
    id: 'careful_10',
    label: 'Atenta',
    description: 'Resolveu 10 notas com alerta',
    rarity: 'rare',
    hint: '10 alertas tratados',
    emoji: '👁️',
    category: 'critério',
  },
  // Horário
  {
    id: 'midnight_owl',
    label: 'Coruja',
    description: 'Aprovou notas entre 22h-5h',
    rarity: 'rare',
    hint: 'Aprovou na madrugada',
    emoji: '🦉',
    category: 'horário',
  },
  {
    id: 'early_bird',
    label: 'Madrugadora',
    description: 'Aprovou notas entre 5h-7h',
    rarity: 'rare',
    hint: 'Aprovou no amanhecer',
    emoji: '🌅',
    category: 'horário',
  },
  // Secretos
  {
    id: 'secret_combo_10',
    label: 'Combo 10',
    description: '10 aprovações em sequência sem negar',
    rarity: 'rare',
    secret: true,
    emoji: '⚡',
    category: 'secret',
  },
  {
    id: 'secret_decision_master',
    label: 'Decisão Master',
    description: 'Critério balanceado: 100 aprovadas + 10 negadas',
    rarity: 'epic',
    secret: true,
    emoji: '⚖️',
    category: 'secret',
  },
  {
    id: 'secret_streak_14',
    label: 'Quinzena',
    description: '14 dias consecutivos',
    rarity: 'rare',
    secret: true,
    emoji: '🔥',
    category: 'secret',
  },
  {
    id: 'secret_legendary_xp',
    label: 'Lenda Viva',
    description: 'Acumulou 50.000 XP',
    rarity: 'legendary',
    secret: true,
    emoji: '👑',
    category: 'secret',
  },
  {
    id: 'secret_sextou',
    label: 'Sextou',
    description: 'Aprovou notas numa sexta-feira',
    rarity: 'common',
    secret: true,
    emoji: '🎉',
    category: 'secret',
  },
];

export const RARITY_ORDER: AchievementRarity[] = ['legendary', 'epic', 'rare', 'common'];

export function findAchievement(id: string): AchievementCatalogItem | undefined {
  return ACHIEVEMENTS_CATALOG.find((a) => a.id === id);
}
