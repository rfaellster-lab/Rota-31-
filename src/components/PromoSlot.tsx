/**
 * @file PromoSlot.tsx
 * @description Banners Thor4Tech — usa imagens locais como fallback,
 *              e Firestore (/api/promotions) quando disponível.
 *              CTA → WhatsApp do Rafael com mensagem contextual.
 * @updated 2026-04-29
 */

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api, type Promotion } from '../services/api';

// WhatsApp Rafael
const WHATSAPP_NUMERO = '5511980470203';
const wa = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`;

// Banner local (imagem) com link contextual pro WhatsApp
type LocalBanner = {
  image: string;
  alt: string;
  ctaUrl: string;
};

// Banners default por placement (caso Firestore esteja vazio)
const DEFAULTS: Record<string, LocalBanner[]> = {
  config: [
    {
      image: `${import.meta.env.BASE_URL}banners/hero-config.webp`,
      alt: 'Automatize além do CT-e — Thor4Tech',
      ctaUrl: wa('Olá Rafael! Vi o painel da Rota 31 e queria saber sobre automações Thor4Tech para o meu negócio.'),
    },
  ],
  sidebar: [
    {
      image: `${import.meta.env.BASE_URL}banners/sidebar-trafego.webp`,
      alt: 'Tráfego pago — Vendas previsíveis',
      ctaUrl: wa('Olá Rafael! Tenho interesse em tráfego pago Thor4Tech (Meta Ads / Google Ads).'),
    },
    {
      image: `${import.meta.env.BASE_URL}banners/sidebar-midia.webp`,
      alt: 'Mídia social — Posts que vendem',
      ctaUrl: wa('Olá Rafael! Quero saber sobre gestão de mídia social Thor4Tech.'),
    },
    {
      image: `${import.meta.env.BASE_URL}banners/sidebar-automacao.webp`,
      alt: 'Automação — Sistemas que rodam sozinhos',
      ctaUrl: wa('Olá Rafael! Vi o painel da Rota 31. Quero automatizar processos no meu negócio.'),
    },
  ],
  login: [],
  notifications: [],
};

interface PromoSlotProps {
  placement: 'sidebar' | 'config' | 'login' | 'notifications';
  className?: string;
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

  // Lista efetiva: Firestore se houver, senão defaults locais
  const localFallback = DEFAULTS[placement] || [];
  const useFirestore = promos.length > 0;
  const total = useFirestore ? promos.length : localFallback.length;

  // Rotação automática a cada 12s se houver mais de 1
  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % total), 12000);
    return () => clearInterval(id);
  }, [total]);

  // Login: assinatura sutil, sem imagem
  if (variant === 'login') {
    return (
      <a
        href={wa('Olá Rafael! Conheci a Thor4Tech pelo painel da Rota 31.')}
        target="_blank"
        rel="noopener noreferrer"
        className={`block text-center text-[10px] text-slate-400 mt-6 hover:text-[#F26522] transition-colors ${className}`}
      >
        Powered by <span className="font-bold text-[#F26522]">Thor4Tech</span> · Automação · Mídia · Tráfego
      </a>
    );
  }

  if (total === 0) return null;

  // Sidebar — imagem vertical clicável
  if (variant === 'sidebar') {
    const item = localFallback[idx % localFallback.length];
    if (!item) return null;
    return (
      <a
        href={item.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all border border-slate-700/50 group relative ${className}`}
        title={item.alt}
      >
        <img src={item.image} alt={item.alt} className="w-full h-auto block" loading="lazy" />
        {/* Indicador de rotação */}
        {localFallback.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {localFallback.map((_, i) => (
              <span key={i} className={`w-1 h-1 rounded-full transition-all ${i === idx ? 'bg-[#F26522] w-3' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
      </a>
    );
  }

  // Config — hero horizontal grande
  if (variant === 'config') {
    const item = (DEFAULTS.config[idx % (DEFAULTS.config.length || 1)]) || DEFAULTS.config[0];
    if (!item) return null;
    return (
      <a
        href={item.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow group ${className}`}
        title={item.alt}
      >
        <img src={item.image} alt={item.alt} className="w-full h-auto block" loading="lazy" />
      </a>
    );
  }

  return null;
}
