/**
 * @file userProfile.ts
 * @description Helpers Firestore pra userProfiles + gamification.
 *              Transações atômicas pra garantir consistência.
 *
 *              Coleções (master-plan §1.1):
 *                userProfiles/{uid}    — perfil estático (carteira, role)
 *                gamification/{uid}    — totalXP, level, rank, streak, badges
 *                gamification/{uid}/eventLog/{autoId} — histórico
 *
 * @story Sprint 2 / Gamification persistence
 * @agent @dev
 * @created 2026-05-12
 */
import admin from 'firebase-admin';
import { computeXp, levelFromXp, rankFromLevel, type XpAction, type XpContext, type XpResult, type Rank } from './xpEngine.js';

const db = () => admin.firestore();
const FieldValue = admin.firestore.FieldValue;

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role: 'admin' | 'operator';
  carteiraId?: string;
  joinedAt: string; // ISO
  createdAt: string;
  updatedAt: string;
}

export interface GamificationState {
  uid: string;
  totalXP: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  rank: Rank;
  streakDays: number;
  longestStreak: number;
  streakLastDay?: string; // YYYY-MM-DD do último ato
  badges: Array<{ id: string; unlockedAt: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }>;
  updatedAt: string;
}

const EMPTY_GAMIFICATION = (uid: string): GamificationState => ({
  uid,
  totalXP: 0,
  level: 1,
  currentLevelXp: 0,
  nextLevelXp: 100,
  rank: 'junior',
  streakDays: 0,
  longestStreak: 0,
  badges: [],
  updatedAt: new Date().toISOString(),
});

/**
 * Garante que userProfile + gamification existem pro user, faz upsert.
 * Idempotente — chame em qualquer endpoint /api/me/*.
 */
export async function ensureUserProfile(user: AuthUser): Promise<UserProfile> {
  const now = new Date().toISOString();
  const profileRef = db().doc(`userProfiles/${user.uid}`);
  const profileSnap = await profileRef.get();
  if (profileSnap.exists) {
    // Update lastSeen
    await profileRef.update({ updatedAt: now, lastSeenAt: now });
    return profileSnap.data() as UserProfile;
  }

  // Cria perfil novo
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    role: (user.role === 'admin' ? 'admin' : 'operator'),
    carteiraId: `ROTA31-${new Date().getFullYear()}-${user.uid.slice(0, 6).toUpperCase()}`,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await profileRef.set(profile);

  // Inicializa gamification
  const gamRef = db().doc(`gamification/${user.uid}`);
  await gamRef.set(EMPTY_GAMIFICATION(user.uid));

  return profile;
}

/**
 * Retorna gamification state atual. Cria zerado se não existir.
 */
export async function getGamification(uid: string): Promise<GamificationState> {
  const ref = db().doc(`gamification/${uid}`);
  const snap = await ref.get();
  if (snap.exists) {
    return snap.data() as GamificationState;
  }
  const empty = EMPTY_GAMIFICATION(uid);
  await ref.set(empty);
  return empty;
}

/**
 * Credita XP via transação atômica.
 * Atualiza: totalXP, level (se subiu), rank (se subiu), streak (se hoje != streakLastDay).
 * Cria entry em gamification/{uid}/eventLog.
 *
 * Retorna o XpResult + estado pós-update — frontend pode mostrar animação.
 */
export interface CreditXpInput {
  uid: string;
  action: XpAction;
  hadAlert?: boolean;
  batchSize?: number;
  invoiceId?: string;
}

export interface CreditXpResult {
  gained: number;
  reason: string;
  baseAmount: number;
  multipliers: XpResult['multipliers'];
  isRare: boolean;
  newTotalXP: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  rank: Rank;
  leveledUp: boolean;
  rankedUp: boolean;
  streakDays: number;
  streakKept: boolean;
}

export async function creditXp(input: CreditXpInput): Promise<CreditXpResult> {
  const now = new Date();
  const isoNow = now.toISOString();
  // BRT date string YYYY-MM-DD (fuso fixo São Paulo)
  const brtToday = brtDateString(now);

  const gamRef = db().doc(`gamification/${input.uid}`);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(gamRef);
    const prev: GamificationState = snap.exists ? (snap.data() as GamificationState) : EMPTY_GAMIFICATION(input.uid);

    // Streak update
    let { streakDays, longestStreak, streakLastDay } = prev;
    const yesterday = brtDateString(new Date(now.getTime() - 24 * 3600 * 1000));
    const streakKept = streakLastDay === brtToday; // já contou hoje
    if (!streakKept) {
      if (streakLastDay === yesterday) {
        streakDays = streakDays + 1;
      } else {
        streakDays = 1; // reset
      }
      streakLastDay = brtToday;
      if (streakDays > longestStreak) longestStreak = streakDays;
    }

    // Computa XP
    const ctx: XpContext = {
      hour: brtHour(now),
      streakDays,
      batchSize: input.batchSize,
      hadAlert: input.hadAlert,
    };
    const xp = computeXp(input.action, ctx);

    const newTotalXP = prev.totalXP + xp.amount;
    const levelInfo = levelFromXp(newTotalXP);
    const newRank = rankFromLevel(levelInfo.level);

    const leveledUp = levelInfo.level > prev.level;
    const rankedUp = newRank !== prev.rank;

    // Update gamification
    const updated: GamificationState = {
      ...prev,
      totalXP: newTotalXP,
      level: levelInfo.level,
      currentLevelXp: levelInfo.currentLevelXp,
      nextLevelXp: levelInfo.nextLevelXp,
      rank: newRank,
      streakDays,
      longestStreak,
      streakLastDay,
      updatedAt: isoNow,
    };
    tx.set(gamRef, updated, { merge: true });

    // Append event log (subcoleção)
    const logRef = gamRef.collection('eventLog').doc();
    tx.set(logRef, {
      type: input.action,
      amount: xp.amount,
      baseAmount: xp.baseAmount,
      reason: xp.reason,
      multipliers: xp.multipliers,
      isRare: xp.isRare,
      invoiceId: input.invoiceId,
      ts: FieldValue.serverTimestamp(),
    });

    return {
      gained: xp.amount,
      reason: xp.reason,
      baseAmount: xp.baseAmount,
      multipliers: xp.multipliers,
      isRare: xp.isRare,
      newTotalXP,
      level: levelInfo.level,
      currentLevelXp: levelInfo.currentLevelXp,
      nextLevelXp: levelInfo.nextLevelXp,
      rank: newRank,
      leveledUp,
      rankedUp,
      streakDays,
      streakKept,
    };
  });
}

// ─── Date helpers (BRT — São Paulo) ─────────────────────────

function brtDateString(d: Date): string {
  // Converte pra BRT (-3) e retorna YYYY-MM-DD
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function brtHour(d: Date): number {
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return brt.getUTCHours();
}
