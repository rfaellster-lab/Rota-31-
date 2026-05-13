/**
 * @file backfill.ts
 * @description Migration one-shot — calcula XP retroativo do user baseado em
 *              quantas notas ele já aprovou/negou/cancelou (lendo Sheets).
 *              Idempotente: marca em userProfiles/{uid}.backfilledAt pra não rodar duas vezes.
 *
 *              Estratégia simplificada (não temos eventLog histórico):
 *              - Conta total aprovadas/negadas no Sheets por aprovadoPor == user
 *              - Aplica XP base SEM multiplicadores (streak/raridade não pode reconstruir)
 *              - Marca counts inicial → achievements ganham detect normal
 *
 * @story Sprint 2 P3 / Backfill XP
 * @agent @dev
 * @created 2026-05-13
 */
import admin from 'firebase-admin';
import { levelFromXp, rankFromLevel } from './xpEngine.js';
import { detectNewUnlocks } from './achievements.js';
import type { GamificationState } from './userProfile.js';

const db = () => admin.firestore();

// XP base por ação (sem multiplicadores — backfill conservador)
const BACKFILL_XP = {
  invoice_approved: 10,
  invoice_denied: 5,
  invoice_cancelled: 3,
};

export interface BackfillSummary {
  uid: string;
  alreadyBackfilled: boolean;
  countsBefore: GamificationState['counts'];
  countsApplied: GamificationState['counts'];
  xpAdded: number;
  newTotalXP: number;
  newLevel: number;
  newRank: string;
  newAchievements: number;
}

export interface CountsFromSheets {
  invoice_approved: number;
  invoice_denied: number;
  invoice_cancelled: number;
}

/**
 * Aplica backfill pro user, idempotente.
 * countsFromSheets é injetado — caller calcula via Sheets API.
 */
export async function backfillUser(
  uid: string,
  countsFromSheets: CountsFromSheets,
): Promise<BackfillSummary> {
  const gamRef = db().doc(`gamification/${uid}`);
  const profileRef = db().doc(`userProfiles/${uid}`);

  return db().runTransaction(async (tx) => {
    const profileSnap = await tx.get(profileRef);
    const gamSnap = await tx.get(gamRef);

    const profile = profileSnap.exists ? profileSnap.data() : null;
    if (profile?.backfilledAt) {
      const gam = gamSnap.data() as GamificationState | undefined;
      return {
        uid,
        alreadyBackfilled: true,
        countsBefore: gam?.counts,
        countsApplied: {
          invoice_approved: 0,
          invoice_denied: 0,
          invoice_cancelled: 0,
          invoice_with_alert_resolved: 0,
          note_added: 0,
        },
        xpAdded: 0,
        newTotalXP: gam?.totalXP || 0,
        newLevel: gam?.level || 1,
        newRank: gam?.rank || 'junior',
        newAchievements: 0,
      };
    }

    const gam = gamSnap.exists
      ? (gamSnap.data() as GamificationState)
      : {
          uid,
          totalXP: 0,
          level: 1,
          currentLevelXp: 0,
          nextLevelXp: 100,
          rank: 'junior' as const,
          streakDays: 0,
          longestStreak: 0,
          badges: [],
          counts: {
            invoice_approved: 0,
            invoice_denied: 0,
            invoice_cancelled: 0,
            invoice_with_alert_resolved: 0,
            note_added: 0,
          },
          updatedAt: new Date().toISOString(),
        };

    const xpAdded =
      countsFromSheets.invoice_approved * BACKFILL_XP.invoice_approved +
      countsFromSheets.invoice_denied * BACKFILL_XP.invoice_denied +
      countsFromSheets.invoice_cancelled * BACKFILL_XP.invoice_cancelled;

    const newTotalXP = gam.totalXP + xpAdded;
    const levelInfo = levelFromXp(newTotalXP);
    const newRank = rankFromLevel(levelInfo.level);

    const newCounts = {
      invoice_approved: (gam.counts?.invoice_approved || 0) + countsFromSheets.invoice_approved,
      invoice_denied: (gam.counts?.invoice_denied || 0) + countsFromSheets.invoice_denied,
      invoice_cancelled: (gam.counts?.invoice_cancelled || 0) + countsFromSheets.invoice_cancelled,
      invoice_with_alert_resolved: gam.counts?.invoice_with_alert_resolved || 0,
      note_added: gam.counts?.note_added || 0,
    };

    // Detecta achievements unlock pelo backfill
    const alreadyUnlocked = new Set((gam.badges || []).map((b) => b.id));
    const newUnlocks = detectNewUnlocks(
      {
        totalXP: newTotalXP,
        level: levelInfo.level,
        streakDays: gam.streakDays,
        longestStreak: gam.longestStreak,
        counts: newCounts,
      },
      alreadyUnlocked,
    );
    const newBadges = newUnlocks.map((a) => ({
      id: a.id,
      rarity: a.rarity,
      unlockedAt: new Date().toISOString(),
    }));

    const updated: GamificationState = {
      ...gam,
      totalXP: newTotalXP,
      level: levelInfo.level,
      currentLevelXp: levelInfo.currentLevelXp,
      nextLevelXp: levelInfo.nextLevelXp,
      rank: newRank,
      counts: newCounts,
      badges: [...(gam.badges || []), ...newBadges],
      updatedAt: new Date().toISOString(),
    };

    tx.set(gamRef, updated, { merge: true });
    tx.set(
      profileRef,
      { backfilledAt: new Date().toISOString(), backfillXp: xpAdded },
      { merge: true },
    );

    // Log no eventLog
    const logRef = gamRef.collection('eventLog').doc();
    tx.set(logRef, {
      type: 'backfill',
      amount: xpAdded,
      baseAmount: xpAdded,
      reason: `Backfill retroativo: ${countsFromSheets.invoice_approved}A + ${countsFromSheets.invoice_denied}N + ${countsFromSheets.invoice_cancelled}C`,
      multipliers: [],
      isRare: false,
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      uid,
      alreadyBackfilled: false,
      countsBefore: gam.counts,
      countsApplied: { ...newCounts, invoice_with_alert_resolved: 0, note_added: 0 },
      xpAdded,
      newTotalXP,
      newLevel: levelInfo.level,
      newRank,
      newAchievements: newBadges.length,
    };
  });
}
