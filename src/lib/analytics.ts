/**
 * @file analytics.ts
 * @description Wrapper Firebase Analytics — eventos tipados, fail-safe.
 *              Se Analytics não inicializou (ad blocker, browser não-Chrome, etc),
 *              chamadas viram no-op. Nunca quebra app.
 *
 *              Events Sprint 2 P3 / Sprint 3 P1 (subset dos 38 totais do roadmap):
 *              - user_login           — quando AuthGate detecta user
 *              - invoice_approved     — após approve success
 *              - invoice_denied       — após deny success
 *              - level_up             — quando r.xp.leveledUp
 *              - rank_up              — quando r.xp.rankedUp
 *              - achievement_unlocked — por badge novo
 *              - store_redeem        — após resgate loja
 *              - feature_flag_view   — primeira vez que user vê dock/insights/loja
 *
 * @story Sprint 2 P3 / Analytics
 * @agent @dev
 * @created 2026-05-13
 */
import type { Analytics } from 'firebase/analytics';

let analyticsInstance: Analytics | null = null;
let analyticsAttempted = false;

async function getAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  if (analyticsAttempted) return null;
  analyticsAttempted = true;

  try {
    const [{ getAnalytics: getA, isSupported }, { firebaseApp }] = await Promise.all([
      import('firebase/analytics'),
      import('./firebase'),
    ]);
    const supported = await isSupported();
    if (!supported) {
      console.info('[analytics] not supported in this browser — skipping');
      return null;
    }
    analyticsInstance = getA(firebaseApp);
    return analyticsInstance;
  } catch (e) {
    console.warn('[analytics] init failed:', e);
    return null;
  }
}

/** Dispara um event no Analytics. Fire-and-forget — não bloqueia. */
export function track(eventName: string, params?: Record<string, unknown>): void {
  void (async () => {
    const a = await getAnalytics();
    if (!a) return;
    try {
      const { logEvent } = await import('firebase/analytics');
      logEvent(a, eventName, (params || {}) as any);
    } catch (e) {
      // silencia — Analytics nunca pode quebrar UX
    }
  })();
}

// Helpers tipados pra eventos críticos
export const analytics = {
  userLogin: (uid: string, role: string) =>
    track('user_login', { uid, role, ts: Date.now() }),

  invoiceApproved: (params: { uid?: string; chave: string; xpGained?: number; hadAlert?: boolean }) =>
    track('invoice_approved', params as any),

  invoiceDenied: (params: { uid?: string; chave: string; motivoLen?: number }) =>
    track('invoice_denied', params as any),

  levelUp: (params: { uid?: string; newLevel: number; totalXP: number }) =>
    track('level_up', params as any),

  rankUp: (params: { uid?: string; newRank: string; level: number }) =>
    track('rank_up', params as any),

  achievementUnlocked: (params: { uid?: string; id: string; rarity: string }) =>
    track('achievement_unlocked', params as any),

  storeRedeem: (params: { uid?: string; itemId: string; costXP: number; rarity: string }) =>
    track('store_redeem', params as any),

  featureFlagView: (params: { flag: string; firstTime: boolean }) =>
    track('feature_flag_view', params as any),
};
