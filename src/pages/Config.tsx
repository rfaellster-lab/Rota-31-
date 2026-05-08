/**
 * @file Config.tsx
 * @description Configurações — abas Operacional (todos) e Desenvolvedor (apenas admin)
 * @updated 2026-04-29
 */

import { useEffect, useState } from 'react';
import { Webhook, MessageSquare, ShieldAlert, RefreshCw, Plus, Trash2, Activity, AlertTriangle, Lock, Users, Crown, UserX, UserCheck, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../store/AuthContext';
import PromoSlot from '../components/PromoSlot';
import { useToast } from '../stores/useToastStore';

interface Rule { row: number; tipoBusca: string; valorBusca: string; nomeCliente: string; valorMinimo: string; porcentagem: string; observacoes: string; }
interface HealthStatus { n8n?: any; sheets?: any; bsoft?: any; firestore?: any; dryRun?: boolean; }
interface UserRow { uid: string; email?: string; displayName?: string; phoneNumber?: string; disabled?: boolean; role: string; createdAt?: string; lastSignInAt?: string; }

const SHEET_ID = '1akTHZ-BpBVv74mSKoxnq1fiAknFBx_BSfIVbb_3ZRQU';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;

type Tab = 'operacional' | 'desenvolvedor' | 'usuarios';

export default function Config() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('operacional');

  const [rules, setRules] = useState<Rule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [errorRules, setErrorRules] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({ tipoBusca: 'CNPJ', valorBusca: '', nomeCliente: '', porcentagem: '', valorMinimo: '' });

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);

  const loadRules = async () => {
    setLoadingRules(true); setErrorRules(null);
    try { const d = await api.getRules(); setRules(d.rules); }
    catch (e: any) { setErrorRules(e.message); }
    finally { setLoadingRules(false); }
  };
  const loadHealth = async () => { try { setHealth(await api.health()); } catch {} };
  const loadUsers = async () => {
    try {
      const r = await fetch(`${(import.meta as any).env?.VITE_API_URL || '/api'}/users`, { headers: { 'x-api-key': (import.meta as any).env.VITE_API_KEY, 'Authorization': `Bearer ${await (await import('../lib/firebase')).auth.currentUser?.getIdToken()}` } });
      const d = await r.json();
      if (r.ok) setUsers(d.users || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadRules(); loadHealth(); }, []);
  useEffect(() => { if (tab === 'usuarios' && isAdmin) loadUsers(); }, [tab, isAdmin]);

  const handleAddRule = async () => {
    if (!newRule.nomeCliente) return;
    try {
      await api.addRule(newRule);
      setNewRule({ tipoBusca: 'CNPJ', valorBusca: '', nomeCliente: '', porcentagem: '', valorMinimo: '' });
      await loadRules();
      toast.success('Regra criada');
    } catch (e: any) { toast.error(`Erro ao criar regra: ${e.message}`); }
  };

  const handleRemoveRule = async (row: number) => {
    if (!confirm('Remover esta regra?')) return;
    try { await api.deleteRule(row); await loadRules(); toast.success('Regra removida'); }
    catch (e: any) { toast.error(`Erro ao remover: ${e.message}`); }
  };

  const updateUserRole = async (uid: string, role: string) => {
    const r = await fetch(`${(import.meta as any).env?.VITE_API_URL || '/api'}/users/${uid}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': (import.meta as any).env.VITE_API_KEY, 'Authorization': `Bearer ${await (await import('../lib/firebase')).auth.currentUser?.getIdToken()}` },
      body: JSON.stringify({ role }),
    });
    if (r.ok) { loadUsers(); toast.success('Permissão atualizada'); } else toast.error('Falha ao alterar permissão');
  };

  const toggleUserDisabled = async (uid: string, disabled: boolean) => {
    const r = await fetch(`${(import.meta as any).env?.VITE_API_URL || '/api'}/users/${uid}/disable`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': (import.meta as any).env.VITE_API_KEY, 'Authorization': `Bearer ${await (await import('../lib/firebase')).auth.currentUser?.getIdToken()}` },
      body: JSON.stringify({ disabled }),
    });
    if (r.ok) loadUsers();
  };

  const StatusCard = ({ label, ok, detail }: { label: string; ok?: boolean; detail?: string }) => (
    <div className={`rounded-lg p-4 border flex items-center gap-3 ${ok === undefined ? 'bg-slate-50 border-slate-200' : ok ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-red-50 border-red-100 text-red-900'}`}>
      <div className={`w-2 h-2 rounded-full ${ok === undefined ? 'bg-slate-400' : ok ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-sm font-medium truncate">{detail || (ok === undefined ? '…' : ok ? 'Operacional' : 'Indisponível')}</p>
      </div>
    </div>
  );

  const Tabs = (
    <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {[
        { id: 'operacional' as Tab, label: 'Operacional', icon: ShieldAlert },
        ...(isAdmin ? [{ id: 'usuarios' as Tab, label: 'Usuários', icon: Users }] : []),
        ...(isAdmin ? [{ id: 'desenvolvedor' as Tab, label: 'Desenvolvedor', icon: Lock }] : []),
      ].map(t => {
        const Icon = t.icon;
        return (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-[2px] whitespace-nowrap transition-colors ${tab === t.id ? 'border-[#F26522] text-[#F26522]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon className="w-4 h-4" /> {t.label}
            {t.id === 'desenvolvedor' && <Crown className="w-3 h-3 text-amber-500" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6 pb-24 md:pb-0 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-1">{isAdmin ? 'Acesso de administrador' : 'Configurações operacionais'}</p>
        </div>
        <button onClick={() => { loadRules(); loadHealth(); }} className="flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm transition-colors">
          <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar
        </button>
      </div>

      {Tabs}

      {/* ── ABA OPERACIONAL ────────────────────────────────────── */}
      {tab === 'operacional' && (
        <div className="space-y-6">
          {/* Status simplificado pra operação */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center"><Activity className="w-4 h-4 mr-2 text-indigo-500" /> Status do Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <StatusCard label="Sistema n8n" ok={health?.n8n?.ok} />
              <StatusCard label="Planilha Google" ok={health?.sheets?.ok} />
              <StatusCard label="Sistema BSOFT" ok={health?.bsoft?.ok} detail={health?.bsoft?.detail} />
              <StatusCard label="Banco Firebase" ok={health?.firestore?.ok} detail={health?.firestore?.ok ? 'Pronto para auditoria' : 'Credencial pendente'} />
            </div>
          </div>

          {/* Regras de frete (operacional) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center"><ShieldAlert className="w-5 h-5 mr-2 text-blue-500" /> Regras de Frete ({rules.length})</h3>
                <p className="text-xs text-gray-500 mt-1">Quando uma regra é cadastrada, a próxima nota daquele cliente já chega com o valor correto no WhatsApp e no painel.</p>
              </div>
              <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-[#F26522] hover:underline flex items-center gap-1 font-semibold">
                Abrir planilha <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {errorRules && <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 mb-3">❌ {errorRules}</div>}

            <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-[500px]">
              <table className="w-full text-left text-sm text-gray-600 min-w-[800px]">
                <thead className="text-[10px] text-gray-500 uppercase font-bold tracking-wider bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-32">Tipo</th>
                    <th className="px-4 py-3">CNPJ / Identificador</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 w-24">% Frete</th>
                    <th className="px-4 py-3 w-28">Mín. (R$)</th>
                    <th className="px-4 py-3 w-16 text-center">⋯</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loadingRules ? (
                    <>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <tr key={`sk-${i}`}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <td key={j} className="px-4 py-3"><div className="h-4 rounded-md bg-slate-200/70 animate-pulse motion-reduce:animate-none" /></td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ) : rules.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-400">Nenhuma regra cadastrada.</td></tr>
                  ) : rules.map(rule => (
                    <tr key={rule.row} className={`hover:bg-gray-50 ${rule.tipoBusca === 'DEFAULT' ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${rule.tipoBusca === 'DEFAULT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{rule.tipoBusca}</span></td>
                      <td className="px-4 py-3 font-mono text-xs">{rule.valorBusca || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{rule.nomeCliente}</td>
                      <td className="px-4 py-3 font-medium">{(parseFloat(String(rule.porcentagem).replace(',', '.')) * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-medium">{rule.valorMinimo}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveRule(rule.row)} disabled={rule.tipoBusca === 'DEFAULT'} className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1 rounded-md hover:bg-red-50" title={rule.tipoBusca === 'DEFAULT' ? 'Regra padrão não pode ser removida' : 'Remover'}>
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formulário de adição — fora do scroll, abaixo da tabela */}
            <div className="mt-4 bg-emerald-50/50 border border-emerald-200 rounded-lg p-4">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> Adicionar nova regra
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo</label>
                  <select value={newRule.tipoBusca} onChange={e => setNewRule({ ...newRule, tipoBusca: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#F26522] bg-white">
                    <option value="CNPJ">CNPJ</option>
                    <option value="DESTINATARIO">DESTINATARIO</option>
                    <option value="REMETENTE">REMETENTE</option>
                    <option value="GRUPO">GRUPO</option>
                    <option value="CLIENTE">CLIENTE</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">CNPJ / Identificador</label>
                  <input type="text" placeholder="CNPJ ou texto" className="w-full p-2 border border-gray-300 rounded text-sm font-mono text-xs outline-none focus:border-[#F26522]" value={newRule.valorBusca} onChange={e => setNewRule({ ...newRule, valorBusca: e.target.value })} />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cliente *</label>
                  <input type="text" placeholder="Razão social" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#F26522]" value={newRule.nomeCliente} onChange={e => setNewRule({ ...newRule, nomeCliente: e.target.value })} />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">% Frete</label>
                  <input type="text" placeholder="0,04" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#F26522]" value={newRule.porcentagem} onChange={e => setNewRule({ ...newRule, porcentagem: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mín. (R$)</label>
                  <input type="text" placeholder="R$ 60,00" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#F26522]" value={newRule.valorMinimo} onChange={e => setNewRule({ ...newRule, valorMinimo: e.target.value })} />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button onClick={handleAddRule} disabled={!newRule.nomeCliente} className="w-full text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors p-2 rounded-lg flex justify-center font-bold" title="Adicionar regra">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-emerald-500" /> Notificações</h3>
            <p className="text-sm text-gray-600">Os avisos continuam chegando no grupo do WhatsApp configurado pela equipe técnica. As notas com aviso ⚠️ <strong>REGRA PADRÃO</strong> devem ser cadastradas aqui acima para que a próxima nota daquele cliente venha com o valor correto.</p>
          </div>

          {/* Banner Thor4Tech — final da aba Operacional */}
          <PromoSlot placement="config" variant="config" />
        </div>
      )}

      {/* ── ABA USUÁRIOS (admin) ───────────────────────────────── */}
      {tab === 'usuarios' && isAdmin && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Users className="w-5 h-5 mr-2 text-indigo-500" /> Usuários cadastrados ({users.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-[10px] text-gray-500 uppercase font-bold tracking-wider bg-gray-50 sticky top-0 z-10">
                <tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Permissão</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2"></th></tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold">{u.displayName || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{u.email}</td>
                    <td className="px-3 py-2">
                      <select value={u.role} onChange={e => updateUserRole(u.uid, e.target.value)} className="text-xs border rounded p-1 bg-white"><option value="admin">Admin</option><option value="operator">Operador</option></select>
                    </td>
                    <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.disabled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.disabled ? 'BLOQUEADO' : 'ATIVO'}</span></td>
                    <td className="px-3 py-2"><button onClick={() => toggleUserDisabled(u.uid, !u.disabled)} className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-1">
                      {u.disabled ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />} {u.disabled ? 'Reativar' : 'Bloquear'}
                    </button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA DESENVOLVEDOR (admin) ──────────────────────────── */}
      {tab === 'desenvolvedor' && isAdmin && (
        <div className="space-y-6">
          {health?.dryRun && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-800">Modo de Simulação ativo (DRY_RUN)</h3>
                <p className="text-xs text-amber-700 mt-1">Aprovar/Negar não disparam o webhook real. Mude <code>DRY_RUN=false</code> em <code>.env.local</code> para emitir CT-e de verdade.</p>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Webhook className="w-5 h-5 mr-2 text-[#F26522]" /> Endpoints & IDs</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Webhook Decisão (n8n)</label><code className="block bg-gray-50 p-2 rounded font-mono text-xs">https://n8n.srv1248902.hstgr.cloud/webhook/processar-decisao-cte</code></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Workflow Principal</label><code className="block bg-gray-50 p-2 rounded font-mono text-xs">WsSceO35i-sZghDR2zNr2</code></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Workflow Avisos</label><code className="block bg-gray-50 p-2 rounded font-mono text-xs">eliT66JPi0nmLnVT7UsZ2</code></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sheet ID</label><code className="block bg-gray-50 p-2 rounded font-mono text-xs">{SHEET_ID}</code></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Firebase Project</label><code className="block bg-gray-50 p-2 rounded font-mono text-xs">rota-31---backend</code></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Activity className="w-5 h-5 mr-2 text-indigo-500" /> Health Detalhado</h3>
            <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-80">{JSON.stringify(health, null, 2)}</pre>
          </div>
        </div>
      )}

      {tab !== 'operacional' && !isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <Lock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-amber-800">Esta área é restrita a administradores.</p>
        </div>
      )}
    </div>
  );
}
