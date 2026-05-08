import React, { useState, useMemo, useEffect } from 'react';
import { useInvoices } from '../store/InvoiceContext';
import { Download, FileText, Settings2, Archive, X, AlertOctagon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatMoney } from '../utils/formatters';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../components/Layout';
import { Invoice } from '../types';
import { useToast } from '../stores/useToastStore';
import { EmptyState, EmptyStatePresets } from '../components/molecules/EmptyState';

export default function History() {
  const { invoices, globalDateRange, updateInvoice, cancelInvoice } = useInvoices();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [columns, setColumns] = useState({
    date: true,
    statusNfe: true,
    client: true,
    origemDestino: false,
    valorNota: true,
    frete: true
  });
  
  // Basic filtering combining global date range, local status and search
  const filtered = useMemo(() => invoices.filter(inv => {
    // Date filter
    const invDate = parseISO(inv.detectadoEm);
    if (globalDateRange.from && !globalDateRange.to && invDate < startOfDay(globalDateRange.from)) return false;
    if (!globalDateRange.from && globalDateRange.to && invDate > endOfDay(globalDateRange.to)) return false;
    if (globalDateRange.from && globalDateRange.to && !isWithinInterval(invDate, { start: startOfDay(globalDateRange.from), end: endOfDay(globalDateRange.to) })) return false;

    // Status filter
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const clientName = inv.pagador === 'REMETENTE' ? inv.remetente.razaoSocial : inv.destinatario.razaoSocial;
      const clientDoc = inv.pagador === 'REMETENTE' ? inv.remetente.cnpj : inv.destinatario.cnpj;
      if (!clientName.toLowerCase().includes(lower) && !clientDoc.includes(lower) && !inv.numero.includes(lower)) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.detectadoEm).getTime() - new Date(a.detectadoEm).getTime()), [invoices, globalDateRange, statusFilter, searchTerm]);

  // Paginação derivada
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Reset page quando filtros mudam (evita ficar preso em página vazia)
  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm, globalDateRange, pageSize]);

  const handleToggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === pageItems.length && pageItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageItems.map(i => i.id)));
    }
  };

  const handleDownloadZip = () => {
    toast.info(`Baixando ZIP com ${selectedIds.size} ${selectedIds.size === 1 ? 'nota' : 'notas'}...`, {
      title: 'Em breve',
    });
    setSelectedIds(new Set());
  };

  const toggleColumn = (key: keyof typeof columns) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0 relative">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
         <div>
            <h1 className="text-2xl font-bold text-[#1F2937]">Histórico de Emissões</h1>
            <p className="text-sm text-slate-500 mt-1">Busque todas as notas emitidas, negadas ou canceladas.</p>
         </div>
         <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {selectedIds.size > 0 && (
              <button 
                onClick={handleDownloadZip}
                className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm transition-colors hover:bg-indigo-700 w-full sm:w-auto"
              >
                 <Archive className="w-4 h-4 mr-2" />
                 Baixar ZIP ({selectedIds.size})
              </button>
            )}
            <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-[#F26522]/20 outline-none">
               <Download className="w-4 h-4 mr-2" />
               CSV
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-[#F26522]/20 outline-none">
               <FileText className="w-4 h-4 mr-2" />
               PDF Diário
            </button>
            <div className="relative flex-1 sm:flex-none">
              <button 
                onClick={() => setColumnsMenuOpen(!columnsMenuOpen)}
                className="w-full flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors hover:bg-slate-50"
              >
                 <Settings2 className="w-4 h-4 mr-2" />
                 Colunas
              </button>
              {columnsMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-2 mb-2 border-b">Exibir Colunas</div>
                  {Object.entries(columns).map(([key, val]) => (
                    <label key={key} className="flex items-center px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522] mr-2" checked={val} onChange={() => toggleColumn(key as keyof typeof columns)} />
                      <span className="text-sm text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
         </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
               <select
                 className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#F26522]/20 shadow-sm appearance-none"
                 value={statusFilter}
                 onChange={e => setStatusFilter(e.target.value)}
               >
                  <option value="all">Todos os Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="aprovada">Aprovadas</option>
                  <option value="emitida">Emitidas</option>
                  <option value="negada">Negadas</option>
                  <option value="cancelada">Canceladas</option>
                  <option value="denegada">Denegadas</option>
                  <option value="erro">Com Erro</option>
               </select>
            </div>
            <div className="md:col-span-2">
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Buscar Cliente ou NF-e</label>
               <input 
                 type="text" 
                 placeholder="Razão Social, CNPJ ou número NF-e..." 
                 className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#F26522]/20 shadow-sm"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] min-h-[400px]">
          <table className="w-full text-left text-sm text-gray-600 whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium w-10">
                   <input type="checkbox" className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522]"
                     checked={pageItems.length > 0 && selectedIds.size === pageItems.length}
                     onChange={handleToggleAll}
                   />
                </th>
                {columns.date && <th className="px-4 py-3 font-medium">Data</th>}
                {columns.statusNfe && <th className="px-4 py-3 font-medium">Status / NF-e</th>}
                {columns.client && <th className="px-4 py-3 font-medium">Cliente (Pagador)</th>}
                {columns.origemDestino && <th className="px-4 py-3 font-medium">Origem ➔ Destino</th>}
                {columns.valorNota && <th className="px-4 py-3 font-medium text-right">Valor da Nota</th>}
                {columns.frete && <th className="px-4 py-3 font-medium text-right">Frete</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {pageItems.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                     <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                       <input type="checkbox" className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522]" 
                          checked={selectedIds.has(inv.id)}
                          onChange={(e) => handleToggleSelection(inv.id, e as any)}
                       />
                     </td>
                     {columns.date && (
                       <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {new Date(inv.detectadoEm).toLocaleDateString('pt-BR')}
                          <div className="text-xs text-gray-500 font-normal">{new Date(inv.detectadoEm).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                       </td>
                     )}
                     {columns.statusNfe && (
                       <td className="px-4 py-3">
                          <div className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mb-1", 
                              inv.status === 'emitida' ? 'bg-blue-100 text-blue-700' : 
                              inv.status === 'aprovada' ? 'bg-emerald-100 text-emerald-700' : 
                              inv.status === 'negada' ? 'bg-gray-200 text-gray-700' : 
                              inv.status === 'cancelada' ? 'bg-red-100 text-red-700' :
                              'bg-red-100 text-red-700'
                          )}>
                             {inv.status}
                          </div>
                          <div className="font-medium text-gray-900">NFe {inv.numero}</div>
                       </td>
                     )}
                     {columns.client && (
                       <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{inv.pagador === 'REMETENTE' ? inv.remetente.razaoSocial : inv.destinatario.razaoSocial}</div>
                          <div className="text-xs text-gray-500">{inv.pagador === 'REMETENTE' ? inv.remetente.cnpj : inv.destinatario.cnpj}</div>
                       </td>
                     )}
                     {columns.origemDestino && (
                       <td className="px-4 py-3 text-xs text-gray-600">
                          {inv.remetente.cidade}/{inv.remetente.uf} <br/><span className="text-gray-400">➔</span> {inv.destinatario.cidade}/{inv.destinatario.uf}
                       </td>
                     )}
                     {columns.valorNota && (
                       <td className="px-4 py-3 text-right text-gray-900 font-medium">
                          {formatMoney(inv.valorNota)}
                       </td>
                     )}
                     {columns.frete && (
                       <td className="px-4 py-3 text-right">
                          <div className="text-gray-900 font-medium">{formatMoney(inv.valorFrete)}</div>
                          <div className="text-xs text-gray-500">{(inv.percentualFrete * 100).toFixed(1)}%</div>
                       </td>
                     )}
                  </tr>
               ))}
               {filtered.length === 0 && (
                 <tr>
                   <td colSpan={7} className="p-0">
                     {searchTerm.trim() ? (
                       <EmptyState {...EmptyStatePresets.noSearchResults(searchTerm)} />
                     ) : (
                       <EmptyState {...EmptyStatePresets.noHistory()} />
                     )}
                   </td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <span>
                Mostrando <span className="font-bold text-slate-900">{startIdx + 1}</span> a <span className="font-bold text-slate-900">{endIdx}</span> de <span className="font-bold text-slate-900">{totalItems.toLocaleString('pt-BR')}</span> notas
              </span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[#F26522]/20"
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                aria-label="Primeira página"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-bold text-slate-700">
                {safePage} <span className="text-slate-400 font-normal">de</span> {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Próxima página"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                aria-label="Última página"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details / Audit / Cancel Modal Slideover */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[999999] overflow-hidden">
           <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedInvoice(null)} />
           <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <div className="w-screen max-w-md transform transition-transform animate-in slide-in-from-right duration-300">
                 <div className="flex h-full flex-col bg-white shadow-2xl">
                    <div className="bg-slate-50 px-4 py-6 sm:px-6 border-b border-gray-200 shrink-0 flex items-center justify-between">
                       <h2 className="text-lg font-bold text-gray-900 flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-slate-400 shrink-0" />
                          <span className="truncate">Detalhes da Nota {selectedInvoice.numero}</span>
                       </h2>
                       <button 
                         className="text-gray-400 hover:text-gray-500 p-2 rounded-full hover:bg-gray-200 transition-colors shrink-0"
                         onClick={() => setSelectedInvoice(null)}
                       >
                         <X className="w-6 h-6" />
                       </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                       
                       {/* Cancel Action */}
                       {selectedInvoice.status === 'emitida' && (
                         <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex gap-3">
                               <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                               <div>
                                  <h3 className="text-sm font-bold text-red-800">Cancelamento CT-e</h3>
                                  <p className="text-xs text-red-600 mt-1 max-w-[200px]">Envia comando de cancelamento à SEFAZ via Webhook.</p>
                               </div>
                            </div>
                            <button
                               onClick={() => {
                                 setCancelMotivo('');
                                 setShowCancelModal(true);
                               }}
                               className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm whitespace-nowrap w-full sm:w-auto"
                            >
                               Cancelar CT-e
                            </button>
                         </div>
                       )}

                       <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Audit Trail (Histórico)</h3>
                          <div className="space-y-4">
                             <div className="relative pl-4 border-l-2 border-emerald-500">
                                <div className="absolute w-2 h-2 bg-emerald-500 rounded-full -left-[5px] top-1 ring-4 ring-white"></div>
                                <p className="text-sm font-bold text-slate-800">Nota Integrada</p>
                                <p className="text-xs text-slate-500 mt-0.5">Sistema importou dados via XML automático.</p>
                                <p className="text-[10px] text-slate-400 mt-1">{new Date(selectedInvoice.detectadoEm).toLocaleString('pt-BR')}</p>
                             </div>
                             
                             {selectedInvoice.status !== 'pendente' && (
                               <div className="relative pl-4 border-l-2 border-[#F26522]">
                                  <div className="absolute w-2 h-2 bg-[#F26522] rounded-full -left-[5px] top-1 ring-4 ring-white"></div>
                                  <p className="text-sm font-bold text-slate-800">Decisão Tomada</p>
                                  <p className="text-xs text-slate-500 mt-0.5">Status alterado para <span className="uppercase font-bold">{selectedInvoice.status}</span> por {selectedInvoice.aprovadoPor || 'Sistema'}.</p>
                                  <p className="text-[10px] text-slate-400 mt-1">{selectedInvoice.aprovadoEm ? new Date(selectedInvoice.aprovadoEm).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</p>
                               </div>
                             )}

                             {selectedInvoice.status === 'cancelada' && (
                               <div className="relative pl-4 border-l-2 border-red-500">
                                  <div className="absolute w-2 h-2 bg-red-500 rounded-full -left-[5px] top-1 ring-4 ring-white"></div>
                                  <p className="text-sm font-bold text-slate-800">CT-e Cancelado</p>
                                  <p className="text-xs text-slate-500 mt-0.5">Usuário (Talita) enviou comando de cancelamento.</p>
                                  <p className="text-[10px] text-slate-400 mt-1">{new Date().toLocaleString('pt-BR')}</p>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal Cancelar CT-e — pede motivo + chama backend */}
      {showCancelModal && selectedInvoice && (
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cancelar CT-e</h3>
              <p className="text-sm text-gray-500 mb-4">
                NF {selectedInvoice.numero}. Esta ação registra o cancelamento no painel.
                <span className="block mt-2 text-amber-700 font-semibold">
                  ⚠ O cancelamento oficial na SEFAZ deve ser feito manualmente no TMS Rota 31.
                </span>
              </p>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                Motivo do cancelamento (obrigatório)
              </label>
              <textarea
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Ex: cliente desistiu, valor errado, duplicidade..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none min-h-[80px] resize-y"
                autoFocus
              />

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={async () => {
                    if (cancelMotivo.trim().length < 3) {
                      toast.warn('Informe o motivo (mínimo 3 caracteres)');
                      return;
                    }
                    await cancelInvoice(selectedInvoice.id, cancelMotivo.trim());
                    setShowCancelModal(false);
                    setSelectedInvoice({ ...selectedInvoice, status: 'cancelada' } as any);
                  }}
                  disabled={cancelMotivo.trim().length < 3}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
