/**
 * @file xpEngine.ts
 * @description Engine determinístico de XP. Função pura — recebe action + context,
 *              retorna XP a creditar + reason + meta. NUNCA chama Firestore.
 *              O caller é responsável por persistir.
 *
 *              Princípios (master-plan/01-architecture-plan.md §1.2):
 *              1. Server-authoritative — cliente nunca calcula
 *              2. Determinístico — mesmo input = mesmo output
 *              3. Multiplicadores configuráveis (streak, hora premium, raridade)
 *              4. Curva exponencial pra level: 50n² + 50n
 *
 * @story Sprint 2 / xpEngine
 * @agent @dev
 * @created 2026-05-12
 */

export type XpAction =
  | 'invoice_approved'
  | 'invoice_denied'
  | 'invoice_cancelled'
  | 'invoice_with_alert_resolved'
  | 'bulk_approve'
  | 'note_added'
  | 'first_action_of_day';

export interface XpContext {
  /** Hora local BRT (0-23) do evento — usado pra "hora premium" */
  hour: number;
  /** Dias consecutivos de streak (0 = primeiro dia) */
  streakDays: number;
  /** Quantidade de itens em ações em lote (bulk) */
  batchSize?: number;
  /** NF tinha alerta? (resolver com alerta dá bônus) */
  hadAlert?: boolean;
}

export interface XpResult {
  /** XP a creditar (já com multiplicadores aplicados) */
  amount: number;
  /** Razão legível pra log e UI */
  reason: string;
  /** XP base antes dos multiplicadores (pra debug/auditoria) */
  baseAmount: number;
  /** Lista de multiplicadores aplicados */
  multipliers: Array<{ name: string; value: number }>;
  /** Se foi um evento "raro" (5% chance) — UI pode mostrar fx */
  isRare: boolean;
}

const BASE_XP: Record<XpAction, number> = {
  invoice_approved: 10,
  invoice_denied: 5, // negar também conta (decisão é decisão)
  invoice_cancelled: 3,
  invoice_with_alert_resolved: 15, // bônus por resolver alerta
  bulk_approve: 5, // por item no batch (multiplicado pelo size)
  note_added: 2,
  first_action_of_day: 5, // bônus de "abrir o dia"
};

const STREAK_MULTIPLIER = (days: number): number => {
  if (days >= 30) return 1.5;
  if (days >= 14) return 1.3;
  if (days >= 7) return 1.2;
  if (days >= 3) return 1.1;
  return 1.0;
};

const HOUR_PREMIUM = (hour: number): number => {
  // Madrugador (5-7) e Coruja (22-5) ganham 1.15x
  if (hour >= 5 && hour <= 7) return 1.15;
  if (hour >= 22 || hour <= 4) return 1.15;
  return 1.0;
};

/**
 * Calcula XP determinístico pra uma ação.
 * Função pura — não causa side-effects.
 */
export function computeXp(action: XpAction, ctx: XpContext): XpResult {
  let base = BASE_XP[action] ?? 0;

  // Bulk approve: XP é por item
  if (action === 'bulk_approve' && ctx.batchSize) {
    base = base * ctx.batchSize;
  }

  // Bônus pra resolver com alerta
  if (action === 'invoice_approved' && ctx.hadAlert) {
    base += 5; // bônus de atenção
  }

  const multipliers: XpResult['multipliers'] = [];

  // Streak
  const streakMult = STREAK_MULTIPLIER(ctx.streakDays);
  if (streakMult > 1) {
    multipliers.push({ name: `Streak ${ctx.streakDays}d`, value: streakMult });
  }

  // Hora premium
  const hourMult = HOUR_PREMIUM(ctx.hour);
  if (hourMult > 1) {
    const label = ctx.hour >= 22 || ctx.hour <= 4 ? 'Coruja' : 'Madrugador';
    multipliers.push({ name: label, value: hourMult });
  }

  // Raridade aleatória (5%)
  const isRare = Math.random() < 0.05;
  if (isRare) {
    multipliers.push({ name: 'Sorte!', value: 2 });
  }

  // Aplicar multiplicadores
  const totalMult = multipliers.reduce((acc, m) => acc * m.value, 1);
  const amount = Math.round(base * totalMult);

  // Reason legível
  let reason = humanReason(action);
  if (multipliers.length > 0) {
    reason += ` ×${totalMult.toFixed(2)}`;
  }

  return {
    amount,
    reason,
    baseAmount: base,
    multipliers,
    isRare,
  };
}

function humanReason(action: XpAction): string {
  const map: Record<XpAction, string> = {
    invoice_approved: 'Nota aprovada',
    invoice_denied: 'Nota negada com critério',
    invoice_cancelled: 'CT-e cancelado',
    invoice_with_alert_resolved: 'Alerta resolvido',
    bulk_approve: 'Aprovação em lote',
    note_added: 'Nota interna criada',
    first_action_of_day: 'Primeira ação do dia',
  };
  return map[action] ?? action;
}

/**
 * Calcula o level baseado em XP total.
 * Curva: xpToLevel(n) = 50n² + 50n
 *   Level 1: 100 XP
 *   Level 2: 300 XP
 *   Level 3: 600 XP
 *   Level 10: 5500 XP
 *   Level 20: 21000 XP
 */
export function xpToLevel(level: number): number {
  return 50 * level * level + 50 * level;
}

export function levelFromXp(totalXp: number): { level: number; currentLevelXp: number; nextLevelXp: number } {
  let level = 1;
  while (xpToLevel(level) <= totalXp) {
    level++;
  }
  // level atual é o maior n onde xpToLevel(n) > totalXp
  // ou seja, ainda não atingiu xpToLevel(level)
  const prevXp = level > 1 ? xpToLevel(level - 1) : 0;
  const nextXp = xpToLevel(level);
  return {
    level,
    currentLevelXp: totalXp - prevXp,
    nextLevelXp: nextXp - prevXp,
  };
}

export type Rank = 'junior' | 'pleno' | 'senior' | 'master' | 'lendario';

/**
 * Mapeia level → rank textual.
 * Junior: 1-5, Pleno: 6-15, Senior: 16-30, Master: 31-50, Lendário: 51+
 */
export function rankFromLevel(level: number): Rank {
  if (level <= 5) return 'junior';
  if (level <= 15) return 'pleno';
  if (level <= 30) return 'senior';
  if (level <= 50) return 'master';
  return 'lendario';
}
