import { useState } from 'react';
import { Settings, Webhook, MessageSquare, ShieldAlert, RefreshCw, Plus, Trash2, Save, Activity } from 'lucide-react';

export default function Config() {
  const [threshold, setThreshold] = useState('3.5');
  const [sheetId, setSheetId] = useState('1BxiMVs0XRX5qwY_XXXXXXXXXXXXXX');
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.rota31.com.br/webhook/cte-receiver');
  const [wpGroup, setWpGroup] = useState('Aprovações Rota 31 Express');
  
  const [alerts, setAlerts] = useState({
    newInvoices: true,
    errorEmissions: true,
  });

  const [rules, setRules] = useState([
    { id: '1', client: 'JORLAN COMERCIAL', type: 'CNPJ: 01.542.240/0016-67', percentage: '3.5', minimum: '60,00' },
    { id: '2', client: 'SUDESTE LTDA', type: 'NOME: SUDESTE', percentage: '3.0', minimum: '55,00' },
    { id: '3', client: 'BAMAQ S/A', type: 'CNPJ: 17.371.493/0001-38', percentage: '4.0', minimum: '70,00' },
  ]);

  const [newRule, setNewRule] = useState({ client: '', type: '', percentage: '', minimum: '' });

  const handleAddRule = () => {
    if (!newRule.client) return;
    setRules([...rules, { ...newRule, id: Math.random().toString() }]);
    setNewRule({ client: '', type: '', percentage: '', minimum: '' });
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleSave = () => {
    alert("Mock: Configurações e Regras salvas com sucesso!");
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0 max-w-5xl mx-auto">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
         <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie integrações, thresholds e alertas.</p>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm transition-colors">
               <RefreshCw className="w-4 h-4 mr-2" />
               Sincronizar Regras
            </button>
            <button onClick={handleSave} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-[#F26522] text-white rounded-lg text-sm font-bold hover:bg-[#d9561c] shadow-sm transition-colors">
               <Save className="w-4 h-4 mr-2" />
               Salvar Alterações
            </button>
         </div>
      </div>

      {/* System Health Module */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
         <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-indigo-500" />
            Dashboard Health & Status do Sistema
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex items-center gap-3">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Certificado Digital</p>
                  <p className="text-sm font-medium text-emerald-900">Válido (302 dias restantes)</p>
               </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex items-center gap-3">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">SEFAZ Nacional</p>
                  <p className="text-sm font-medium text-emerald-900">Operacional (98ms)</p>
               </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex items-center gap-3">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Integração n8n</p>
                  <p className="text-sm font-medium text-emerald-900">Online</p>
               </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 flex items-center gap-3">
               <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
               <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Fila de Processamento</p>
                  <p className="text-sm font-medium text-amber-900">2 Notas Aguardando</p>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* Integrações */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
               <Webhook className="w-5 h-5 mr-2 text-[#F26522]" />
               Integração n8n & API
            </h3>
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Webhook URL de Entrada</label>
                  <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-full bg-white border border-gray-300 focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] text-gray-600 text-sm rounded-lg p-2 outline-none font-mono text-xs transition-shadow" />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Planilha Source de Regras</label>
                  <p className="text-xs text-gray-500 mb-2">Caso as regras venham de um Google Sheets externo.</p>
                  <input type="text" value={sheetId} onChange={e => setSheetId(e.target.value)} className="w-full bg-white border border-gray-300 focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] text-gray-600 text-sm rounded-lg p-2 outline-none font-mono text-xs transition-shadow" />
               </div>
            </div>
         </div>

         {/* Alertas */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
               <MessageSquare className="w-5 h-5 mr-2 text-emerald-500" />
               Notificações (WhatsApp)
            </h3>
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grupo de Aprovação</label>
                  <input type="text" value={wpGroup} onChange={e => setWpGroup(e.target.value)} className="w-full bg-white border border-gray-300 focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] text-gray-600 text-sm rounded-lg p-2 outline-none transition-shadow" />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alertas Ativos</label>
                  <div className="flex flex-col space-y-2 mt-2">
                     <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={alerts.newInvoices} onChange={e => setAlerts({...alerts, newInvoices: e.target.checked})} className="w-4 h-4 text-[#F26522] border-gray-300 rounded focus:ring-[#F26522]" />
                        <span className="ml-2 text-sm text-gray-600">Novas notas para aprovação</span>
                     </label>
                     <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={alerts.errorEmissions} onChange={e => setAlerts({...alerts, errorEmissions: e.target.checked})} className="w-4 h-4 text-[#F26522] border-gray-300 rounded focus:ring-[#F26522]" />
                        <span className="ml-2 text-sm text-gray-600">Erro de emissão na SEFAZ</span>
                     </label>
                  </div>
               </div>
            </div>
         </div>

         {/* Regras CRUD */}
         <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
               <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <ShieldAlert className="w-5 h-5 mr-2 text-blue-500" />
                  Regras de Frete & Thresholds Específicos
               </h3>
               <div className="flex items-center bg-gray-50 rounded-lg p-2 border border-gray-200 w-full sm:w-auto">
                  <span className="text-xs font-bold text-gray-500 uppercase mr-3">Threshold Global (%)</span>
                  <input type="number" step="0.1" value={threshold} onChange={e => setThreshold(e.target.value)} className="w-20 text-center border border-gray-300 rounded p-1 text-sm font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#F26522]" />
               </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
               <table className="w-full text-left text-sm text-gray-600 min-w-[700px]">
                  <thead className="text-[10px] text-gray-500 uppercase font-bold tracking-wider bg-gray-50 border-b border-gray-200">
                     <tr>
                        <th className="px-4 py-3">Cliente / Identificador</th>
                        <th className="px-4 py-3">Tipo de Busca</th>
                        <th className="px-4 py-3 w-32">Percentual (%)</th>
                        <th className="px-4 py-3 w-32">Piso Mín. (R$)</th>
                        <th className="px-4 py-3 w-16 text-center">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                     {rules.map(rule => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                           <td className="px-4 py-3 font-semibold text-gray-900">{rule.client}</td>
                           <td className="px-4 py-3 font-mono text-xs">{rule.type}</td>
                           <td className="px-4 py-3 font-medium">{rule.percentage}%</td>
                           <td className="px-4 py-3 font-medium">R$ {rule.minimum}</td>
                           <td className="px-4 py-3 text-center">
                              <button onClick={() => handleRemoveRule(rule.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50">
                                 <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                           </td>
                        </tr>
                     ))}
                     <tr className="bg-gray-50/50">
                        <td className="px-3 py-2">
                           <input type="text" placeholder="Razão Social ou Nome..." className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#F26522]" value={newRule.client} onChange={e => setNewRule({...newRule, client: e.target.value})} />
                        </td>
                        <td className="px-3 py-2">
                           <input type="text" placeholder="CNPJ: ... ou NOME: ..." className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#F26522]" value={newRule.type} onChange={e => setNewRule({...newRule, type: e.target.value})} />
                        </td>
                        <td className="px-3 py-2">
                           <input type="number" step="0.1" placeholder="3.5" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#F26522]" value={newRule.percentage} onChange={e => setNewRule({...newRule, percentage: e.target.value})} />
                        </td>
                        <td className="px-3 py-2">
                           <input type="number" placeholder="50.00" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#F26522]" value={newRule.minimum} onChange={e => setNewRule({...newRule, minimum: e.target.value})} />
                        </td>
                        <td className="px-3 py-2 text-center">
                           <button onClick={handleAddRule} disabled={!newRule.client} className="text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors p-2 rounded-lg w-full flex justify-center">
                              <Plus className="w-4 h-4" />
                           </button>
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
         
      </div>

    </div>
  );
}
