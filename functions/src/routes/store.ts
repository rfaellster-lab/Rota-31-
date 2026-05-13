/**
 * @file routes/store.ts
 * @description Routes /api/store/* — listar items, resgatar, histórico.
 * @story Sprint 3 / Loja XP
 * @agent @dev
 * @created 2026-05-13
 */
import { Router, Request, Response, NextFunction } from 'express';
import { listStoreItems, redeemItem, listMyPurchases } from '../services/store/storeItems.js';
import { getGamification } from '../services/gamification/userProfile.js';

export interface AuthedRequest extends Request {
  authUser?: { uid: string; email?: string; name?: string; role?: string };
}

const wrap = (fn: any) => (req: any, res: any, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function createStoreRouter(firebaseAdminEnabled: boolean): Router {
  const router = Router();

  // GET /api/store/items — catálogo filtrado pelo nível do user
  router.get('/items', wrap(async (req: AuthedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
    if (!firebaseAdminEnabled) {
      return res.json({ items: listStoreItems(99), level: 99, firestoreDisabled: true });
    }
    const gam = await getGamification(req.authUser.uid);
    const items = listStoreItems(gam.level);
    res.json({ items, level: gam.level, totalXP: gam.totalXP });
  }));

  // POST /api/store/redeem/:itemId — resgata
  router.post('/redeem/:itemId', wrap(async (req: AuthedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
    if (!firebaseAdminEnabled) {
      return res.status(503).json({ error: 'Firestore indisponível' });
    }
    const result = await redeemItem(req.authUser.uid, req.params.itemId);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  }));

  // GET /api/store/purchases — histórico do user
  router.get('/purchases', wrap(async (req: AuthedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
    if (!firebaseAdminEnabled) return res.json({ purchases: [] });
    const purchases = await listMyPurchases(req.authUser.uid);
    res.json({ purchases, count: purchases.length });
  }));

  return router;
}
