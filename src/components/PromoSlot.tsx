/**
 * @file PromoSlot.tsx
 * @description Slot rotativo de banners Thor4Tech — lê de /api/promotions
 * @created 2026-04-29
 */

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api, type Promotion } from '../services/api';

interface PromoSlotProps {
  placement: Promotion['placement'];
  className?: string;
  /** Modo de exibição visual */
  variant?: 'sidebar' | 'login' | 'config' | 'minimal';
}

export default function PromoSlot({ placement, className = '', variant = 'sidebar' }: PromoSlotProps) {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api.getPromotions(placement)
      .then(d => setPromos((d.promotions || []).filter(p => p.active).sort((a, b) => (b.priority || 0) - (a.priority || 0))))
      .catch(() => setPromos([]));
  }, [placement]);

  // Rotação automática entre banners (5s) se houver mais de 1
  useEffect(() => {
    if (promos.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % promos.length), 8000);
    return () => clearInterval(id);
  }, [promos.length]);

  if (promos.length === 0) {
    // Fallback discreto — sem promoção ativa, mostra "powered by Thor4Tech"
    if (variant === 'login') {
      return (
        <div className={`text-center text-[10px] text-slate-400 mt-6 ${className}`}>
          Powered by <span className="font-bold text-[#F26522]">Thor4Tech</span>
        </div>
      );
    }
    return null;
  }

  const promo = promos[idx];

  if (variant === 'sidebar') {
    return (
      <a
        href={promo.ctaUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full bg-gradient-to-br from-[#1F2937] to-slate-800 text-white rounded-xl p-3 hover:shadow-lg transition-all border border-slate-700 group ${className}`}
        title={promo.title}
      >
        <p className="text-[9px] font-bold text-[#F26522] uppercase tracking-widest mb-1">Thor4Tech</p>
        <p className="text-xs font-bold text-white leading-tight mb-1">{promo.title}</p>
        <p className="text-[10px] text-slate-300 leading-tight line-clamp-2">{promo.body}</p>
        {promo.ctaLabel && (
          <p className="text-[10px] font-bold text-[#F26522] mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            {promo.ctaLabel} <ExternalLink className="w-2.5 h-2.5" />
          </p>
        )}
      </a>
    );
  }

  if (variant === 'login') {
    return (
      <a
        href={promo.ctaUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={`block text-center text-[10px] text-slate-400 mt-6 hover:text-[#F26522] transition-colors ${className}`}
      >
        {promo.title} · <span className="font-bold text-[#F26522]">Thor4Tech</span>
      </a>
    );
  }

  // variant === 'config'
  return (
    <a
      href={promo.ctaUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-gradient-to-br from-[#1F2937] via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-[#F26522] uppercase tracking-widest mb-2">Thor4Tech · Automação</p>
          <h3 className="text-xl sm:text-2xl font-black mb-2">{promo.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">{promo.body}</p>
        </div>
        {promo.ctaLabel && (
          <div className="shrink-0">
            <span className="inline-flex items-center gap-2 bg-[#F26522] hover:bg-[#d9561c] text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
              {promo.ctaLabel} <ExternalLink className="w-4 h-4" />
            </span>
          </div>
        )}
      </div>
    </a>
  );
}
