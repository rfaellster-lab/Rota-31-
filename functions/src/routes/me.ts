/**
 * @file routes/me.ts
 * @description Routes /api/me/* — perfil + gamification do user logado.
 *              Esses endpoints só fazem sentido com Firebase Auth ativo.
 *              Se firestore/auth não estiverem disponíveis, retornam stub.
 *
 * @story Sprint 2 / Gamification API
 * @agent @dev
 * @created 2026-05-12
 */
import { Router, Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { ensureUserProfile, getGamification } from '../services/gamification/userProfile.js';

export interface AuthedRequest extends Request {
  authUser?: { uid: string; email?: string; name?: string; role?: string };
}

// Async wrapper p/ propagar erros pro express handler
const wrap = (fn: any) => (req: any, res: any, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function createMeRouter(firebaseAdminEnabled: boolean): Router {
  const router = Router();

  // GET /api/me/profile — userProfile + gamification merged
  router.get('/profile', wrap(async (req: AuthedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
    if (!firebaseAdminEnabled) {
      return res.json({
        profile: { uid: req.authUser.uid, role: 'operator' },
        gamification: null,
        firestoreDisabled: true,
      });
    }
    const profile = await ensureUserProfile(req.authUser);
    const gamification = await getGamification(req.authUser.uid);
    res.json({ profile, gamification });
  }));

  // GET /api/me/xp — só o gamification (rápido, mais frequente)
  router.get('/xp', wrap(async (req: AuthedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
    if (!firebaseAdminEnabled) return res.json({ gamification: null, firestoreDisabled: true });
    const gamification = await getGamification(req.authUser.uid);
    res.json({ gamification });
  }));

  // GET /api/me/badges — lista de badges desbloqueadas
  router.get('/badges', wrap(async (req: AuthedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
    if (!firebaseAdminEnabled) return res.json({ badges: [] });
    const gam = await getGamification(req.authUser.uid);
    res.json({ badges: gam.badges, count: gam.badges.length });
  }));

  // GET /api/me/events — histórico de XP events (últimos 50)
  router.get('/events', wrap(async (req: AuthedRequest, res: Response) => {
    if (!req.authUser) return res.status(401).json({ error: 'Não autenticado' });
    if (!firebaseAdminEnabled) return res.json({ events: [] });
    const snap = await admin
      .firestore()
      .collection(`gamification/${req.authUser.uid}/eventLog`)
      .orderBy('ts', 'desc')
      .limit(50)
      .get();
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ events, count: events.length });
  }));

  return router;
}
