/**
 * @file useNotificationStore.ts
 * @description Notificações in-app (toasts são separados — useToastStore).
 *              Persiste fila pra exibir em NotificationBell organism futuramente.
 * @story Sprint 1 / A3
 * @agent @dev
 * @created 2026-05-08
 */
import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  body?: string;
  level: 'info' | 'warn' | 'success' | 'error';
  createdAt: number;
  read: boolean;
  link?: string;
}

interface NotificationStore {
  items: Notification[];
  unreadCount: number;

  push: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  items: [],
  unreadCount: 0,

  push: (n) => {
    const item: Notification = {
      ...n,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      read: false,
    };
    set((s) => ({
      items: [item, ...s.items].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }));
  },

  markRead: (id) =>
    set((s) => {
      const item = s.items.find((i) => i.id === id);
      if (!item || item.read) return s;
      return {
        items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)),
        unreadCount: Math.max(0, s.unreadCount - 1),
      };
    }),

  markAllRead: () =>
    set((s) => ({
      items: s.items.map((i) => ({ ...i, read: true })),
      unreadCount: 0,
    })),

  remove: (id) =>
    set((s) => {
      const wasUnread = s.items.find((i) => i.id === id && !i.read);
      return {
        items: s.items.filter((i) => i.id !== id),
        unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    }),

  clear: () => set({ items: [], unreadCount: 0 }),
}));
