/**
 * @file storeItems.ts
 * @description Catálogo da Loja XP + helpers de redeem.
 *              10 items default — todos digitais/cosméticos (sem custo monetário).
 *              Items "consumíveis" (one-shot) e "unlockáveis" (permanentes).
 *
 * @story Sprint 3 / Loja XP
 * @agent @dev
 * @created 2026-05-13
 */
import admin from 'firebase-admin';
import type { GamificationState } from '../gamification/userProfile.js';

const db = () => admin.firestore();

export type StoreItemKind = 'cosmetic' | 'boost' | 'badge' | 'mystery';
export type StoreItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface StoreItem {
  id: string;
  title: string;
  description: string;
  costXP: number;
  kind: StoreItemKind;
  rarity: StoreItemRarity;
  emoji: string; // visual placeholder (até designer)
  // Quem pode comprar? minLevel = mínimo level pra desbloquear compra
  minLevel?: number;
  // Pode comprar várias vezes?
  consumable?: boolean;
  available: boolean;
}

// Catálogo inicial — Sprint 3 P1
export const DEFAULT_STORE_ITEMS: StoreItem[] = [
  {
    id: 'theme_dark',
    title: 'Tema Noturno',
    description: 'Painel em modo escuro pra menos cansaço visual.',
    costXP: 200,
    kind: 'cosmetic',
    rarity: 'common',
    emoji: '🌙',
    available: true,
  },
  {
    id: 'theme_ocean',
    title: 'Tema Oceano',
    description: 'Tons de azul calmante. Mais foco, menos pressão.',
    costXP: 350,
    kind: 'cosmetic',
    rarity: 'rare',
    emoji: '🌊',
    minLevel: 3,
    available: true,
  },
  {
    id: 'theme_orange_pro',
    title: 'Tema Laranja Pro',
    description: 'Versão premium do laranja Rota — mais saturado.',
    costXP: 500,
    kind: 'cosmetic',
    rarity: 'rare',
    emoji: '🔥',
    minLevel: 5,
    available: true,
  },
  {
    id: 'badge_pioneer',
    title: 'Selo Pioneira',
    description: 'Marcador permanente que aparece no seu perfil. Pioneira da v2.',
    costXP: 1000,
    kind: 'badge',
    rarity: 'epic',
    emoji: '⭐',
    minLevel: 8,
    available: true,
  },
  {
    id: 'mystery_box',
    title: 'Caixa Misteriosa',
    description: 'Conteúdo aleatório (tema / boost / selo). Sorte é sua.',
    costXP: 300,
    kind: 'mystery',
    rarity: 'rare',
    emoji: '🎁',
    consumable: true,
    available: true,
  },
  {
    id: 'streak_shield',
    title: 'Escudo de Streak',
    description: 'Protege seu streak por 1 dia se você esquecer. Single-use.',
    costXP: 250,
    kind: 'boost',
    rarity: 'common',
    emoji: '🛡️',
    consumable: true,
    minLevel: 4,
    available: true,
  },
  {
    id: 'xp_multiplier_2x_1h',
    title: 'Multiplicador 2x (1h)',
    description: 'Dobra XP ganho por 1 hora. Use quando tiver volume pra aprovar.',
    costXP: 400,
    kind: 'boost',
    rarity: 'rare',
    emoji: '⚡',
    consumable: true,
    minLevel: 6,
    available: true,
  },
  {
    id: 'custom_avatar_color',
    title: 'Cor de Avatar Custom',
    description: 'Escolha a cor do seu avatar — mais 12 opções.',
    costXP: 150,
    kind: 'cosmetic',
    rarity: 'common',
    emoji: '🎨',
    available: true,
  },
  {
    id: 'compliment_pack',
    title: 'Pack de Mensagens',
    description: 'Toast aleatório de elogio aparece a cada 50 aprovações.',
    costXP: 100,
    kind: 'cosmetic',
    rarity: 'common',
    emoji: '💬',
    available: true,
  },
  {
    id: 'badge_legendary_aspirant',
    title: 'Selo Aspirante a Lenda',
    description: 'Aparece pra todos no leaderboard. Status simbólico.',
    costXP: 2500,
    kind: 'badge',
    rarity: 'legendary',
    emoji: '👑',
    minLevel: 15,
    available: true,
  },
];

/**
 * Lista items disponíveis pro user (filtra por minLevel).
 * Read-only — não tem persistência ainda (catálogo fixo no código).
 */
export function listStoreItems(level: number): StoreItem[] {
  return DEFAULT_STORE_ITEMS.filter(
    (i) => i.available && (!i.minLevel || level >= i.minLevel),
  );
}

export function findStoreItem(id: string): StoreItem | undefined {
  return DEFAULT_STORE_ITEMS.find((i) => i.id === id);
}

export interface RedeemResult {
  ok: boolean;
  error?: string;
  itemId: string;
  costXP: number;
  newTotalXP?: number;
  mysteryReward?: { kind: string; label: string };
}

/**
 * Resgata item da loja. Transação atômica — debita XP do gamification/{uid}.
 * - Verifica XP suficiente
 * - Verifica minLevel
 * - Verifica disponibilidade
 * - Grava em storePurchases/{uid}/{auto_id}
 */
export async function redeemItem(
  uid: string,
  itemId: string,
): Promise<RedeemResult> {
  const item = findStoreItem(itemId);
  if (!item) return { ok: false, error: 'Item não encontrado', itemId, costXP: 0 };
  if (!item.available)
    return { ok: false, error: 'Item indisponível', itemId, costXP: item.costXP };

  const gamRef = db().doc(`gamification/${uid}`);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(gamRef);
    if (!snap.exists)
      return { ok: false, error: 'Usuário sem gamification ativa', itemId, costXP: item.costXP };
    const gam = snap.data() as GamificationState;

    if (item.minLevel && gam.level < item.minLevel) {
      return {
        ok: false,
        error: `Nível mínimo: ${item.minLevel}. Você está no ${gam.level}.`,
        itemId,
        costXP: item.costXP,
      };
    }
    if (gam.totalXP < item.costXP) {
      return {
        ok: false,
        error: `XP insuficiente: ${gam.totalXP} / ${item.costXP}`,
        itemId,
        costXP: item.costXP,
      };
    }

    // Check se já comprou (não-consumível)
    if (!item.consumable) {
      const existingSnap = await tx.get(
        db()
          .collection(`storePurchases/${uid}/items`)
          .where('itemId', '==', itemId)
          .limit(1),
      );
      if (!existingSnap.empty) {
        return { ok: false, error: 'Você já comprou esse item', itemId, costXP: item.costXP };
      }
    }

    // Mystery roll
    let mysteryReward: RedeemResult['mysteryReward'];
    if (item.kind === 'mystery') {
      const rolls = [
        { kind: 'theme', label: 'Tema aleatório desbloqueado' },
        { kind: 'xp_boost', label: '+100 XP de bônus' },
        { kind: 'badge', label: 'Selo Sortuda' },
        { kind: 'streak_shield', label: 'Escudo de Streak (1d)' },
      ];
      mysteryReward = rolls[Math.floor(Math.random() * rolls.length)];
    }

    // Debita XP — mantém level/rank (não rebaixa)
    const newTotalXP = gam.totalXP - item.costXP;
    tx.update(gamRef, {
      totalXP: newTotalXP,
      updatedAt: new Date().toISOString(),
    });

    // Grava compra
    const purchaseRef = db().collection(`storePurchases/${uid}/items`).doc();
    tx.set(purchaseRef, {
      itemId,
      costXP: item.costXP,
      rarity: item.rarity,
      kind: item.kind,
      mysteryReward: mysteryReward || null,
      redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      itemId,
      costXP: item.costXP,
      newTotalXP,
      mysteryReward,
    };
  });
}

export async function listMyPurchases(uid: string): Promise<Array<{ id: string; itemId: string; redeemedAt: string }>> {
  const snap = await db()
    .collection(`storePurchases/${uid}/items`)
    .orderBy('redeemedAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      itemId: data.itemId,
      redeemedAt: data.redeemedAt?.toDate?.().toISOString?.() || data.redeemedAt || '',
    };
  });
}
