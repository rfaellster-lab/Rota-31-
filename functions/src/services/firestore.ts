import admin from 'firebase-admin';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export type PanelRole = 'admin' | 'operator';

export interface PanelUser {
  uid: string;
  email?: string;
  name?: string;
  role?: PanelRole;
}

export interface AuditEventInput {
  type: string;
  actor?: PanelUser;
  target?: { kind: string; id: string };
  metadata?: Record<string, unknown>;
}

export interface NotificationInput {
  level: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  source: 'panel' | 'sheets' | 'bsoft' | 'n8n';
  targetPath?: string;
  metadata?: Record<string, unknown>;
}

export interface Promotion {
  id: string;
  active: boolean;
  placement: 'sidebar' | 'config' | 'notifications';
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  priority: number;
}

const DEFAULT_PROMOTION: Promotion = {
  id: 'default-thor4tech',
  active: true,
  placement: 'notifications',
  title: 'Automacao e integracoes por Thor4Tech',
  body: 'Este painel reduz retrabalho operacional e pode evoluir para outras rotinas da transportadora.',
  ctaLabel: 'Conhecer melhorias',
  ctaUrl: 'https://thor4tech.com.br',
  priority: 1,
};

let hasWarned = false;

function db() {
  if (!admin.apps.length) return null;
  return getFirestore();
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/private_key[^,}]*/gi, 'private_key:[redacted]');
}

async function bestEffort<T>(label: string, op: () => Promise<T>, fallback: T): Promise<T> {
  const database = db();
  if (!database) return fallback;
  try {
    return await op();
  } catch (error) {
    if (!hasWarned) {
      hasWarned = true;
      console.warn(`[Firestore disabled] ${label}: ${safeError(error)}`);
    }
    return fallback;
  }
}

export async function getFirestoreHealth() {
  const database = db();
  if (!database) return { ok: false, configured: false, error: 'Firebase Admin nao inicializado' };
  try {
    const collections = await database.listCollections();
    return {
      ok: true,
      configured: true,
      collections: collections.map(c => c.id).slice(0, 20),
    };
  } catch (error) {
    return { ok: false, configured: true, error: safeError(error) };
  }
}

export async function syncUserProfile(user?: PanelUser | null) {
  if (!user?.uid) return;
  await bestEffort('syncUserProfile', async () => {
    const ref = db()!.collection('users').doc(user.uid);
    const snap = await ref.get();
    const base = {
      uid: user.uid,
      email: user.email || null,
      displayName: user.name || null,
      role: user.role || 'operator',
      lastSeenAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(
      snap.exists ? base : { ...base, createdAt: FieldValue.serverTimestamp(), disabled: false },
      { merge: true }
    );
    return true;
  }, false);
}

export async function writeAuditEvent(event: AuditEventInput) {
  await bestEffort('writeAuditEvent', async () => {
    await db()!.collection('auditEvents').add({
      type: event.type,
      actor: event.actor || null,
      target: event.target || null,
      metadata: event.metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  }, false);
}

export async function createNotification(input: NotificationInput) {
  await bestEffort('createNotification', async () => {
    await db()!.collection('notifications').add({
      ...input,
      readBy: {},
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  }, false);
}

export async function listNotifications(user?: PanelUser | null) {
  return bestEffort('listNotifications', async () => {
    const snap = await db()!
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return snap.docs.map(doc => {
      const data = doc.data();
      const readBy = data.readBy || {};
      return {
        id: doc.id,
        level: data.level || 'info',
        title: data.title || '',
        message: data.message || '',
        source: data.source || 'panel',
        targetPath: data.targetPath || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        read: !!(user?.uid && readBy[user.uid]),
      };
    });
  }, []);
}

export async function markNotificationRead(id: string, user?: PanelUser | null) {
  if (!id || !user?.uid) return false;
  return bestEffort('markNotificationRead', async () => {
    await db()!.collection('notifications').doc(id).set({
      readBy: { [user.uid]: true },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  }, false);
}

// ─── Estado por nota (notas internas + snooze) ──────────────
export interface NoteInput { text: string; user: PanelUser; }

function invoiceRef(chave: string) { return db()!.collection('invoiceState').doc(chave); }

export async function addInvoiceNote(chave: string, input: NoteInput) {
  return bestEffort('addInvoiceNote', async () => {
    await invoiceRef(chave).set({
      lastNoteAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    const noteRef = invoiceRef(chave).collection('notes').doc();
    await noteRef.set({
      id: noteRef.id,
      text: input.text,
      user: input.user,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: noteRef.id };
  }, null);
}

export async function listInvoiceNotes(chave: string) {
  return bestEffort('listInvoiceNotes', async () => {
    const snap = await invoiceRef(chave).collection('notes').orderBy('createdAt', 'asc').limit(100).get();
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        text: data.text || '',
        user: data.user?.name || data.user?.email || 'desconhecido',
        date: data.createdAt?.toDate?.()?.toISOString?.() || null,
      };
    });
  }, []);
}

export async function setInvoiceSnooze(chave: string, until: string | null, user: PanelUser) {
  return bestEffort('setInvoiceSnooze', async () => {
    await invoiceRef(chave).set({
      snoozeUntil: until,
      snoozeBy: until ? user : null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  }, false);
}

export async function getInvoiceState(chave: string) {
  return bestEffort('getInvoiceState', async () => {
    const snap = await invoiceRef(chave).get();
    if (!snap.exists) return { snoozeUntil: null, notes: [] };
    const data = snap.data() || {};
    const notes = await listInvoiceNotes(chave);
    return { snoozeUntil: data.snoozeUntil || null, notes };
  }, { snoozeUntil: null, notes: [] });
}

/** Lista state de várias chaves de uma vez (batch read) */
export async function listInvoiceStates(chaves: string[]) {
  return bestEffort('listInvoiceStates', async () => {
    if (!chaves.length) return {};
    const result: Record<string, any> = {};
    // Firestore aceita até 500 docs em batch via getAll
    const refs = chaves.slice(0, 500).map(c => invoiceRef(c));
    const docs = await db()!.getAll(...refs);
    for (const doc of docs) {
      if (doc.exists) {
        const data = doc.data() || {};
        result[doc.id] = { snoozeUntil: data.snoozeUntil || null, hasNotes: !!data.lastNoteAt };
      }
    }
    return result;
  }, {});
}

export async function listPromotions(placement?: Promotion['placement']) {
  return bestEffort('listPromotions', async () => {
    const collection = db()!.collection('promotions');
    const snap = await collection.where('active', '==', true).limit(50).get();
    const items = (snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Promotion[])
      .filter(item => !placement || item.placement === placement)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 10);
    return items.length ? items : [DEFAULT_PROMOTION];
  }, [DEFAULT_PROMOTION]);
}
