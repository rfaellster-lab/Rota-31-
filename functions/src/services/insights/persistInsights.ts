/**
 * @file persistInsights.ts
 * @description Persistência dos insights no Firestore — grava em insights/{insightId}
 *              com TTL via validUntil. Endpoint /api/insights lê só ativos.
 *
 * @story Sprint 2 P2 / Insights persistence
 * @agent @dev
 * @created 2026-05-12
 */
import admin from 'firebase-admin';
import type { InsightLite } from './computeInsights.js';

const db = () => admin.firestore();

export interface PersistedInsight extends InsightLite {
  id: string;
  scope: 'global'; // por enquanto só global; futuramente per-user
  computedAt: string; // ISO
  validUntil: string; // ISO (computedAt + TTL)
}

const TTL_HOURS = 6;

export async function persistInsights(insights: InsightLite[]): Promise<{ written: number }> {
  if (insights.length === 0) return { written: 0 };
  const batch = db().batch();
  const computedAt = new Date();
  const validUntil = new Date(computedAt.getTime() + TTL_HOURS * 3600 * 1000);

  // Limpa insights anteriores expirados (mantém histórico via outro path se quiser)
  // Aqui sobrescreve: 1 doc por type+scope+dia
  const dateKey = computedAt.toISOString().slice(0, 10);

  for (const ins of insights) {
    const docId = `${ins.type}_${dateKey}`;
    const ref = db().doc(`insights/${docId}`);
    const persisted: PersistedInsight = {
      ...ins,
      id: docId,
      scope: 'global',
      computedAt: computedAt.toISOString(),
      validUntil: validUntil.toISOString(),
    };
    batch.set(ref, persisted);
  }

  await batch.commit();
  return { written: insights.length };
}

export async function listActiveInsights(
  audience: 'admin' | 'operator' | 'all' = 'all',
): Promise<PersistedInsight[]> {
  const now = new Date().toISOString();
  let q = db()
    .collection('insights')
    .where('validUntil', '>', now)
    .orderBy('validUntil', 'desc')
    .limit(20);
  const snap = await q.get();
  const all = snap.docs.map((d) => d.data() as PersistedInsight);
  return all.filter((i) => i.audience === 'all' || i.audience === audience);
}

/**
 * Marca insight como dismissed pelo usuário (não some pra outros).
 * Grava em insightDismissals/{uid}_{insightId}.
 */
export async function dismissInsight(uid: string, insightId: string): Promise<void> {
  const ref = db().doc(`insightDismissals/${uid}_${insightId}`);
  await ref.set({
    uid,
    insightId,
    dismissedAt: new Date().toISOString(),
  });
}

export async function getDismissedIds(uid: string): Promise<Set<string>> {
  const snap = await db()
    .collection('insightDismissals')
    .where('uid', '==', uid)
    .get();
  return new Set(snap.docs.map((d) => (d.data().insightId as string)));
}
