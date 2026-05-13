/**
 * @file useStreakLossAversion.ts
 * @description Hook que monitora streak e dispara toast preventivo quando user
 *              tem streak ativo + ficou muito tempo sem ação (>= 20h).
 *              Kahneman loss aversion: medo de perder > prazer de ganhar.
 *
 *              Dispara MAX 1x por sessão pra não ser irritante.
 *              Tom Talita: profissional, sem dramatizar.
 *
 * @story Sprint 3 P2 / Streak loss aversion
 * @agent @dev
 * @created 2026-05-13
 */
import { useEffect, useRef } from 'react';
import { useGamificationStore } from '../stores/useGamificationStore';
import { useFeatureFlags } from '../stores/useFeatureFlags';
import { useToast } from '../stores/useToastStore';

const RISK_HOURS = 20; // dispara aviso se >= 20h sem ação
const STORAGE_KEY = 'rota31:streak_warning_shown';

export function useStreakLossAversion(): void {
  const xpEnabled = useFeatureFlags((s) => s.flags.XP_ENABLED);
  const streakDays = useGamificationStore((s) => s.streakDays);
  const loaded = useGamificationStore((s) => s.loaded);
  const toast = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (!xpEnabled || !loaded || streakDays === 0) return;
    if (shownRef.current) return;

    // Verifica se já mostrou hoje (sessão atual ou dias anteriores)
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(STORAGE_KEY) === today) {
        shownRef.current = true;
        return;
      }
    } catch {}

    // Pega timestamp da última ação via eventLog seria ideal, mas
    // como não temos client-side, usamos heurística: a hora local.
    // Se for tarde (20h+) e tem streak, prevenir.
    const nowHour = new Date().getHours();
    if (nowHour < 20) return; // só após 20h BRT

    shownRef.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, today);
    } catch {}

    toast.warn(
      `Seu streak de ${streakDays} ${streakDays === 1 ? 'dia' : 'dias'} pode quebrar se você não aprovar nada hoje. Aproveite o final do dia!`,
      { title: '🔥 Streak em risco', durationMs: 8000 },
    );
  }, [xpEnabled, loaded, streakDays, toast]);
}
