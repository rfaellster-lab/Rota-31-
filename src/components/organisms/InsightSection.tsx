/**
 * @file InsightSection.tsx
 * @description Organism InsightSection — fetcha insights ativos via /api/insights,
 *              renderiza top-3 em grid no Dashboard. Dismiss persiste no Firestore.
 *              Só aparece se feature flag INSIGHTS_ENABLED ligado.
 *
 *              CTA URLs internas (router) ou externas. Externa abre nova aba.
 * @story Sprint 2 P2 / InsightSection
 * @agent @dev
 * @created 2026-05-12
 */
import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { InsightCard, type InsightCardData } from '../atoms/InsightCard';
import { useFeatureFlags } from '../../stores/useFeatureFlags';
import { useToast } from '../../stores/useToastStore';

const API_KEY = (import.meta as any).env?.VITE_API_KEY || '';
const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'x-api-key': API_KEY };
  try {
    const { auth } = await import('../../lib/firebase');
    if (auth.currentUser) {
      h['Authorization'] = `Bearer ${await auth.currentUser.getIdToken()}`;
    }
  } catch {}
  return h;
}

async function fetchInsights(): Promise<InsightCardData[]> {
  try {
    const r = await fetch(`${API_BASE}/insights`, { headers: await authHeaders() });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.insights || []) as InsightCardData[];
  } catch {
    return [];
  }
}

async function dismissInsight(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/insights/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST',
      headers: await authHeaders(),
    });
  } catch (e) {
    console.warn('[InsightSection] dismiss falhou:', e);
  }
}

export const InsightSection: FC = () => {
  const flagEnabled = useFeatureFlags((s) => s.flags.INSIGHTS_ENABLED);
  const [insights, setInsights] = useState<InsightCardData[]>([]);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!flagEnabled) return;
    let cancelled = false;
    (async () => {
      const data = await fetchInsights();
      if (cancelled) return;
      setInsights(data);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [flagEnabled]);

  const handleDismiss = async (id: string) => {
    setInsights((arr) => arr.filter((i) => i.id !== id));
    await dismissInsight(id);
  };

  const handleCta = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  if (!flagEnabled || !loaded || insights.length === 0) return null;

  const top3 = insights.slice(0, 3);

  return (
    <section className="col-span-2 md:col-span-12 px-2 mb-4" aria-label="Insights">
      <div className="mb-2 flex items-center gap-2 px-2">
        <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Insights ({insights.length})
        </h2>
        {insights.length > 3 && (
          <button
            type="button"
            onClick={() => toast.info('Ver todos os insights — em breve')}
            className="ml-auto text-[10px] font-medium text-slate-500 hover:text-slate-700"
          >
            Ver todos
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {top3.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onDismiss={handleDismiss}
            onCta={handleCta}
          />
        ))}
      </div>
    </section>
  );
};
