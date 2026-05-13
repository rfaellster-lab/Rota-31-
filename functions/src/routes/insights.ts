/**
 * @file routes/insights.ts
 * @description Routes /api/insights/* — lista ativos + dismiss + recompute manual.
 * @story Sprint 2 P2 / Insights API
 * @agent @dev
 * @created 2026-05-12
 */
import { Router, Request, Response, NextFunction } from 'express';
import { listActiveInsights, dismissInsight, getDismissedIds } from '../services/insights/persistInsights.js';

export interface AuthedRequest extends Request {
  authUser?: { uid: string; email?: string; name?: string; role?: string };
}

const wrap = (fn: any) => (req: any, res: any, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function createInsightsRouter(firebaseAdminEnabled: boolean): Router {
  const router = Router();

  // GET /api/insights — lista ativos filtrados por audience do usuário
  router.get('/', wrap(async (req: AuthedRequest, res: Response) => {
    if (!firebaseAdminEnabled) return res.json({ insights: [], firestoreDisabled: true });
    const audience = req.authUser?.role === 'admin' ? 'admin' : 'operator';
    const allActive = await listActiveInsights(audience);
    const dismissed = req.authUser ? await getDismissedIds(req.authUser.uid) : new Set<string>();
    const insights = allActive.filter((i) => !dismissed.has(i.id));
    res.json({ insights, count: insights.length });
  }));

  // POST /api/insights/:id/dismiss — esconde pra esse usuário
  router.post('/:id/dismiss', wrap(async (req: AuthedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
    if (!firebaseAdminEnabled) return res.json({ ok: true, firestoreDisabled: true });
    await dismissInsight(req.authUser.uid, req.params.id);
    res.json({ ok: true });
  }));

  return router;
}
