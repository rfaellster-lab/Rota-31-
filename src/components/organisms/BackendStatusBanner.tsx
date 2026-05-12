/**
 * @file BackendStatusBanner.tsx
 * @description Banner vermelho no topo se backend não responde (canary check).
 *              Prevê classe de bug "bundle quebrado → 404 silencioso → UI vazia".
 *              Faz hit em /api/health no mount e a cada 60s.
 * @story Sprint 1 / fix-2026-05-12 (prevenção painel cego)
 * @agent @dev
 * @created 2026-05-12
 */
import { useEffect, useState, type FC } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

type Status = 'checking' | 'ok' | 'fail';

const CHECK_INTERVAL_MS = 60_000;

export const BackendStatusBanner: FC = () => {
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    try {
      const res = await api.health();
      // Health pode vir com `ok: false` em algum serviço — mas se a request foi
      // bem sucedida (HTTP 200 + JSON parsável), backend está acessível.
      if (res && typeof res === 'object') {
        setStatus('ok');
        setError(null);
      } else {
        setStatus('fail');
        setError('Resposta inválida do backend');
      }
    } catch (e: any) {
      setStatus('fail');
      // Distingue tipos de erro pra mensagem útil
      const msg = e?.message || String(e);
      if (msg.includes('Failed to fetch')) {
        setError('Não conseguimos falar com o backend. Verifique sua conexão.');
      } else if (msg.includes('404')) {
        setError('Backend respondeu 404. Pode ser deploy quebrado — avise o suporte.');
      } else if (msg.includes('401') || msg.includes('403')) {
        // 401/403 significa que o backend está respondendo — autenticação é problema separado
        setStatus('ok');
        setError(null);
      } else {
        setError(`Backend indisponível: ${msg}`);
      }
    }
  };

  useEffect(() => {
    void check();
    const id = setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (status !== 'fail') return null;

  return (
    <div
      role="alert"
      className="bg-rose-600 px-4 py-2 text-white shadow-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 shrink-0" aria-hidden />
          <div className="text-sm">
            <span className="font-semibold">Sistema com problema. </span>
            <span className="opacity-90">
              {error || 'Backend não está respondendo.'} Os dados podem estar desatualizados.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setStatus('checking'); void check(); }}
          className="flex shrink-0 items-center gap-1 rounded bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Tentar novamente
        </button>
      </div>
    </div>
  );
};
