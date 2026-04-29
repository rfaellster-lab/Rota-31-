import React, { useState } from "react";
import { useInvoices } from "../store/InvoiceContext";
import { Invoice } from "../types";
import { cn } from "../components/Layout";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Clock,
  ChevronDown,
  Check,
  X,
  FileText,
  Settings,
  ArrowRight,
} from "lucide-react";
import {
  formatDistanceToNow,
  isToday,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePicker } from "../components/DateRangePicker";
import { DashboardCharts } from "../components/DashboardCharts";

export default function Dashboard() {
  const {
    invoices,
    approveInvoice,
    denyInvoice,
    globalDateRange,
    setGlobalDateRange,
    bulkApproveInvoices,
    addNoteToInvoice,
    snoozeInvoice,
  } = useInvoices();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [pagadorFilter, setPagadorFilter] = useState<string>("todos");

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [isDenyModalOpen, setIsDenyModalOpen] = useState(false);
  const [invoiceToDeny, setInvoiceToDeny] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [slideOverTab, setSlideOverTab] = useState<
    "detalhes" | "notas" | "xml"
  >("detalhes");
  const [newNote, setNewNote] = useState("");
  const [isEditingFrete, setIsEditingFrete] = useState(false);
  const [editedFreteValue, setEditedFreteValue] = useState("");
  const { updateInvoice } = useInvoices();

  // Filter invoices based on global properties
  const periodInvoices = invoices.filter((inv) => {
    if (inv.snoozeUntil && inv.status === "pendente") {
      const snoozeDate = startOfDay(parseISO(inv.snoozeUntil));
      const today = startOfDay(new Date());
      if (snoozeDate > today) return false;
    }
    if (!globalDateRange.from && !globalDateRange.to) return true;
    const invDate = parseISO(inv.detectadoEm);
    if (globalDateRange.from && !globalDateRange.to) {
      return invDate >= startOfDay(globalDateRange.from);
    }
    if (!globalDateRange.from && globalDateRange.to) {
      return invDate <= endOfDay(globalDateRange.to);
    }
    if (globalDateRange.from && globalDateRange.to) {
      return isWithinInterval(invDate, {
        start: startOfDay(globalDateRange.from),
        end: endOfDay(globalDateRange.to),
      });
    }
    return true;
  });

  // KPIs based on periodInvoices (instead of all invoices)
  const pending = periodInvoices.filter((inv) => inv.status === "pendente");
  const approvedTotal = periodInvoices.filter(
    (inv) => inv.status === "aprovada",
  );
  const deniedTotal = periodInvoices.filter((inv) => inv.status === "negada");
  const emittedTotal = periodInvoices.filter((inv) => inv.status === "emitida");
  const errorInvoices = periodInvoices.filter((inv) => inv.status === "erro");

  const approvedValue = approvedTotal.reduce(
    (acc, curr) => acc + curr.valorNota,
    0,
  );
  const emittedValue = emittedTotal.reduce(
    (acc, curr) => acc + curr.valorNota,
    0,
  );

  // Formatter
  const formatMoney = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  // Filtering
  const filtered = periodInvoices
    .filter((inv) => {
      if (statusFilter !== "todos" && inv.status !== statusFilter) return false;
      if (
        pagadorFilter !== "todos" &&
        inv.pagador.toLowerCase() !== pagadorFilter
      )
        return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (
          !inv.numero.includes(lower) &&
          !inv.remetente.razaoSocial.toLowerCase().includes(lower) &&
          !inv.destinatario.razaoSocial.toLowerCase().includes(lower) &&
          !inv.remetente.cnpj.includes(lower)
        ) {
          return false;
        }
      }
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.detectadoEm).getTime() - new Date(a.detectadoEm).getTime(),
    );

  const handleToggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const handleBulkApprove = () => {
    bulkApproveInvoices(Array.from(selectedIds), "Talita");
    setSelectedIds(new Set());
  };

  const handleApprove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    approveInvoice(id, "Talita");
  };

  const handleDenyClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceToDeny(id);
    setIsDenyModalOpen(true);
  };

  const executeDeny = () => {
    if (invoiceToDeny) {
      denyInvoice(invoiceToDeny, denyReason || "Cancelado pelo cliente");
      setIsDenyModalOpen(false);
      setInvoiceToDeny(null);
      setDenyReason("");
    }
  };

  const getStatusBadgeDefaults = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "aprovada":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "emitida":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "negada":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "erro":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pendente":
        return "PENDENTE";
      case "aprovada":
        return "APROVADA";
      case "emitida":
        return "EMITIDA";
      case "negada":
        return "NEGADA";
      case "erro":
        return "ERRO";
      default:
        return status.toUpperCase();
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-12 gap-4 pb-24 md:pb-0">
      <div className="col-span-2 md:col-span-12 md:hidden mb-2 z-50">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
            Filtrar Período
          </span>
          <DateRangePicker
            value={globalDateRange}
            onChange={setGlobalDateRange}
          />
        </div>
      </div>

      {/* Pendentes */}
      <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[100px]">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Pendentes
        </span>
        <div className="flex flex-col gap-1 mt-2">
          <span className="text-3xl font-black text-[#F26522]">
            {pending.length}
          </span>
          <span className="text-[10px] text-orange-600 font-medium animate-pulse">
            Aguardando
          </span>
        </div>
      </div>

      {/* Aprovadas Hoje */}
      <div className="col-span-1 md:col-span-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[100px]">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Aprovadas
        </span>
        <div className="flex flex-col gap-1 mt-2">
          <span className="text-3xl font-black text-slate-800">
            {approvedTotal.length}
          </span>
          <span className="text-[10px] font-bold text-green-600">
            {formatMoney(approvedValue)}
          </span>
        </div>
      </div>

      {/* Negadas Hoje */}
      <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[100px]">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Negadas
        </span>
        <div className="flex flex-col gap-1 mt-2">
          <span className="text-3xl font-black text-slate-800">
            {deniedTotal.length}
          </span>
        </div>
      </div>

      {/* Emitidas Hoje */}
      <div className="col-span-1 md:col-span-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[100px]">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Emitidas
        </span>
        <div className="flex flex-col gap-1 mt-2">
          <span className="text-3xl font-black text-slate-800">
            {emittedTotal.length}
          </span>
          <span className="text-[10px] font-bold text-slate-500">
            {formatMoney(emittedValue)}
          </span>
        </div>
      </div>

      {/* Com Erro */}
      <div className="col-span-2 md:col-span-2 bg-red-50 rounded-2xl p-4 shadow-sm border border-red-100 flex flex-col sm:flex-row md:flex-col justify-between min-h-[100px]">
        <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest">
          Com Erro
        </span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-red-600">
            {errorInvoices.length}
          </span>
          <span className="text-[10px] text-red-700 font-bold tracking-tighter">
            ATENÇÃO
          </span>
        </div>
      </div>

      <div className="col-span-2 md:col-span-12">
        <DashboardCharts invoices={periodInvoices} />
      </div>

      {/* Filters Bar */}
      <div className="col-span-2 md:col-span-12 flex flex-col md:flex-row items-center justify-between px-2 gap-4 mt-2">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 appearance-none whitespace-nowrap"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="todos">Status: Todos</option>
            <option value="pendente">Status: Pendente</option>
            <option value="aprovada">Status: Aprovada</option>
            <option value="emitida">Status: Emitida</option>
            <option value="erro">Status: Com erro</option>
          </select>

          <select
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 appearance-none"
            value={pagadorFilter}
            onChange={(e) => setPagadorFilter(e.target.value)}
          >
            <option value="todos">Pagador: Todos</option>
            <option value="remetente">Pagador: Remetente</option>
            <option value="destinatario">Pagador: Destinatário</option>
          </select>
        </div>
        <div className="flex-1 max-w-md w-full md:ml-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por NF-e, CNPJ ou Razão Social..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="col-span-2 md:col-span-12 bg-[#F26522]/10 border border-[#F26522]/30 rounded-lg p-3 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
          <div className="text-sm font-bold text-[#F26522]">
            {selectedIds.size} nota{selectedIds.size > 1 ? "s" : ""} selecionada
            {selectedIds.size > 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Aprovar {selectedIds.size} nota{selectedIds.size > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="col-span-2 md:col-span-12 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse relative z-0">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 font-bold whitespace-nowrap">
                <th className="px-4 py-4 w-10 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522]"
                    checked={
                      filtered.length > 0 &&
                      selectedIds.size === filtered.length
                    }
                    onChange={handleToggleAll}
                  />
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">NF-e nº</th>
                <th className="px-6 py-4 hidden sm:table-cell">Remetente</th>
                <th className="px-6 py-4 hidden md:table-cell">Destinatário</th>
                <th className="px-6 py-4">Pagador</th>
                <th className="px-6 py-4">Valor NF / Frete</th>
                <th className="px-6 py-4 hidden lg:table-cell">Detectado</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Nenhuma nota encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map((inv) => {
                  const isPending = inv.status === "pendente";

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={cn(
                        "hover:bg-slate-50 transition-colors cursor-pointer group border-b",
                        isPending
                          ? "border-slate-100 bg-orange-50/50 hover:bg-orange-50"
                          : "border-slate-100",
                        inv.status === "emitida" && "opacity-80",
                        inv.status === "erro" &&
                          "bg-red-50/30 hover:bg-red-50/50",
                      )}
                    >
                      <td
                        className="px-4 py-4 w-10 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522]"
                          checked={selectedIds.has(inv.id)}
                          onChange={(e) =>
                            handleToggleSelection(inv.id, e as any)
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase ring-2 ring-orange-400/20">
                            Pendente
                          </span>
                        )}
                        {inv.status === "emitida" && (
                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                            Emitida
                          </span>
                        )}
                        {inv.status === "erro" && (
                          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                            Erro
                          </span>
                        )}
                        {!isPending &&
                          inv.status !== "emitida" &&
                          inv.status !== "erro" && (
                            <div
                              className={cn(
                                "inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold border",
                                getStatusBadgeDefaults(inv.status),
                              )}
                            >
                              {getStatusLabel(inv.status)}
                            </div>
                          )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">
                          {inv.numero}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ...{inv.chaveAcesso.slice(-6)}
                        </div>
                      </td>

                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div
                          className="font-medium text-slate-900 truncate max-w-[150px] lg:max-w-[200px]"
                          title={inv.remetente.razaoSocial}
                        >
                          {inv.remetente.razaoSocial}
                        </div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          {inv.remetente.cidade} - {inv.remetente.uf}
                        </div>
                      </td>

                      <td className="px-6 py-4 hidden md:table-cell">
                        <div
                          className="font-medium text-slate-900 truncate max-w-[150px] lg:max-w-[200px]"
                          title={inv.destinatario.razaoSocial}
                        >
                          {inv.destinatario.razaoSocial}
                        </div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          {inv.destinatario.cidade} - {inv.destinatario.uf}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {inv.pagador === "REMETENTE" ? (
                            <>
                              <span className="px-1.5 py-0.5 rounded bg-orange-600 text-white text-[9px] font-black">
                                REM
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {inv.remetente.razaoSocial.split(" ")[0]}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black">
                                DEST
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {inv.destinatario.razaoSocial.split(" ")[0]}
                              </span>
                            </>
                          )}
                        </div>

                        {(inv.precisaAnaliseFOB ||
                          inv.freteFallbackEmitente) && (
                          <div className="mt-1.5">
                            <span className="text-xs text-yellow-700 font-bold bg-yellow-100/80 px-2 py-0.5 rounded inline-block inline-flex items-center">
                              ⚠️ Análise Extra
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">
                          {formatMoney(inv.valorNota)}
                        </div>
                        <div className="flex items-center text-[11px] text-[#F26522] font-semibold mt-0.5">
                          <span>{formatMoney(inv.valorFrete)}</span>
                          <span className="ml-1">
                            ({(inv.percentualFrete * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 hidden lg:table-cell whitespace-nowrap text-xs text-slate-500 font-medium">
                        {formatDistanceToNow(parseISO(inv.detectadoEm), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {isPending ? (
                            <>
                              <button
                                onClick={(e) => handleApprove(inv.id, e)}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                                title="Aprovar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDenyClick(inv.id, e)}
                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-colors"
                                title="Negar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : inv.status === "erro" ? (
                            <button className="px-3 py-1.5 bg-[#1F2937] text-white rounded-lg text-xs font-bold transition-colors hover:bg-slate-800">
                              Reenviar
                            </button>
                          ) : (
                            <button className="text-[#F26522] text-xs font-bold hover:underline p-1">
                              Ver detalhes
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deny Modal */}
      {isDenyModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Motivo da Recusa
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Por que você está negando a emissão desta nota?
              </p>

              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 mb-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
              >
                <option value="">Selecione um motivo comum...</option>
                <option value="Cancelado pelo cliente">
                  Cancelado pelo cliente
                </option>
                <option value="Valor da NF incorreto">
                  Valor da NF incorreto
                </option>
                <option value="Regra de frete não se aplica">
                  Regra de frete não se aplica
                </option>
                <option value="Falta de dados">
                  Falta de dados do destinatário/remetente
                </option>
                <option value="Outro">Outro</option>
              </select>

              <div className="flex space-x-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setIsDenyModalOpen(false);
                    setInvoiceToDeny(null);
                    setDenyReason("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeny}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
                >
                  Confirmar Recusa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Slide-Over (Modal) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[999999] overflow-hidden">
          <div
            className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedInvoice(null)}
          />
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <div className="w-screen max-w-2xl transform transition-transform animate-in slide-in-from-right duration-300">
              <div className="flex h-full flex-col bg-white shadow-2xl">
                <div className="bg-gray-50 px-4 py-6 sm:px-6 border-b border-gray-200 shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-gray-400 shrink-0" />
                      <span className="truncate">Nota {selectedInvoice.numero}</span>
                    </h2>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 p-2 rounded-full hover:bg-gray-200 transition-colors shrink-0"
                      onClick={() => {
                        setSelectedInvoice(null);
                        setSlideOverTab("detalhes");
                      }}
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 break-all font-mono">
                    {selectedInvoice.chaveAcesso}
                  </div>

                  <div className="mt-4 flex gap-4 border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <button
                      onClick={() => setSlideOverTab("detalhes")}
                      className={cn(
                        "pb-2 text-sm font-bold border-b-2 transition-colors outline-none",
                        slideOverTab === "detalhes"
                          ? "border-[#F26522] text-[#F26522]"
                          : "border-transparent text-gray-500 hover:text-gray-700",
                      )}
                    >
                      Detalhes
                    </button>
                    <button
                      onClick={() => setSlideOverTab("notas")}
                      className={cn(
                        "pb-2 text-sm font-bold border-b-2 transition-colors outline-none flex items-center gap-1",
                        slideOverTab === "notas"
                          ? "border-[#F26522] text-[#F26522]"
                          : "border-transparent text-gray-500 hover:text-gray-700",
                      )}
                    >
                      Notas Internas
                      {selectedInvoice.notasInternas &&
                        selectedInvoice.notasInternas.length > 0 && (
                          <span className="bg-gray-200 text-gray-800 text-[10px] px-1.5 py-0.5 rounded-full">
                            {selectedInvoice.notasInternas.length}
                          </span>
                        )}
                    </button>
                    <button
                      onClick={() => setSlideOverTab("xml")}
                      className={cn(
                        "pb-2 text-sm font-bold border-b-2 transition-colors outline-none",
                        slideOverTab === "xml"
                          ? "border-[#F26522] text-[#F26522]"
                          : "border-transparent text-gray-500 hover:text-gray-700",
                      )}
                    >
                      XML
                    </button>
                  </div>
                </div>

                <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6 pb-safe space-y-6">
                  {slideOverTab === "detalhes" && (
                    <>
                      {/* Status Banner */}
                      <div
                        className={cn(
                          "rounded-lg p-4 mb-6 border",
                          getStatusBadgeDefaults(selectedInvoice.status),
                        )}
                      >
                        <div className="flex items-center font-bold mb-1">
                          {getStatusLabel(selectedInvoice.status)}
                        </div>
                        <div className="text-sm opacity-90 flex flex-col space-y-1 mt-2">
                          <span>
                            Detectado em:{" "}
                            {new Date(
                              selectedInvoice.detectadoEm,
                            ).toLocaleString("pt-BR")}
                          </span>
                          {selectedInvoice.aprovadoEm && (
                            <span>
                              Aprovado em:{" "}
                              {new Date(
                                selectedInvoice.aprovadoEm,
                              ).toLocaleString("pt-BR")}{" "}
                              por {selectedInvoice.aprovadoPor}
                            </span>
                          )}
                          {selectedInvoice.emitidoEm && (
                            <span>
                              Emitido em:{" "}
                              {new Date(
                                selectedInvoice.emitidoEm,
                              ).toLocaleString("pt-BR")}
                            </span>
                          )}
                          {selectedInvoice.erroMsg && (
                            <span className="font-semibold text-red-700 mt-2">
                              Erro: {selectedInvoice.erroMsg}
                            </span>
                          )}
                        </div>

                        {selectedInvoice.status === "pendente" && (
                          <div className="mt-4 flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={(e) => {
                                handleApprove(selectedInvoice.id, e);
                                setSelectedInvoice(null);
                              }}
                              className="w-full sm:w-auto px-4 py-2 focus:outline-none bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition-colors flex justify-center"
                            >
                              Aprovar Emissão
                            </button>
                            <button
                              onClick={(e) => {
                                handleDenyClick(selectedInvoice.id, e);
                                setSelectedInvoice(null);
                              }}
                              className="w-full sm:w-auto px-4 py-2 focus:outline-none bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 font-medium transition-colors flex justify-center"
                            >
                              Negar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                snoozeInvoice(
                                  selectedInvoice.id,
                                  tomorrow.toISOString(),
                                );
                                setSelectedInvoice(null);
                              }}
                              className="w-full sm:w-auto px-4 py-2 focus:outline-none bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 font-medium transition-colors flex justify-center whitespace-nowrap"
                            >
                              Adiar (Amanhã)
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Accordion equivalent using simple divs for prototype */}
                      <div className="space-y-6">
                        {/* Empresas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                              Remetente
                            </h3>
                            <p className="font-semibold text-gray-900">
                              {selectedInvoice.remetente.razaoSocial}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedInvoice.remetente.cnpj}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedInvoice.remetente.cidade} -{" "}
                              {selectedInvoice.remetente.uf}
                            </p>
                          </div>
                          <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                              Destinatário
                            </h3>
                            <p className="font-semibold text-gray-900">
                              {selectedInvoice.destinatario.razaoSocial}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedInvoice.destinatario.cnpj}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedInvoice.destinatario.cidade} -{" "}
                              {selectedInvoice.destinatario.uf}
                            </p>
                          </div>
                        </div>

                        {/* Custos */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 border-b pb-2">
                            Valores & Frete
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                Valor da NF
                              </p>
                              <p className="font-semibold text-gray-900">
                                {formatMoney(selectedInvoice.valorNota)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                Valor do Frete
                              </p>
                              {isEditingFrete ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-xs text-gray-500 font-bold">
                                      R$
                                    </span>
                                    <input
                                      type="number"
                                      className="w-24 pl-7 pr-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#F26522]/30"
                                      value={editedFreteValue}
                                      onChange={(e) =>
                                        setEditedFreteValue(e.target.value)
                                      }
                                      step="0.01"
                                      autoFocus
                                    />
                                  </div>
                                  <button
                                    onClick={() => {
                                      const val = parseFloat(editedFreteValue);
                                      if (!isNaN(val)) {
                                        updateInvoice(selectedInvoice.id, {
                                          valorFrete: val,
                                        });
                                        setSelectedInvoice({
                                          ...selectedInvoice,
                                          valorFrete: val,
                                        });
                                        addNoteToInvoice(
                                          selectedInvoice.id,
                                          `Valor do frete alterado manualmente para R$ ${val.toFixed(2)}`,
                                          "Talita",
                                        );
                                      }
                                      setIsEditingFrete(false);
                                    }}
                                    className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setIsEditingFrete(false)}
                                    className="text-gray-400 p-1 hover:bg-gray-100 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="group flex items-center gap-2">
                                  <p className="font-bold text-primary-600">
                                    {formatMoney(selectedInvoice.valorFrete)}
                                  </p>
                                  {selectedInvoice.status === "pendente" && (
                                    <button
                                      onClick={() => {
                                        setEditedFreteValue(
                                          selectedInvoice.valorFrete.toString(),
                                        );
                                        setIsEditingFrete(true);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#F26522] text-xs underline"
                                    >
                                      Editar
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                Pagador
                              </p>
                              <p className="font-medium text-gray-900">
                                {selectedInvoice.pagador} (
                                {selectedInvoice.tipoFrete})
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                Base Regra
                              </p>
                              <p className="font-medium text-gray-900">
                                {(
                                  selectedInvoice.percentualFrete * 100
                                ).toFixed(2)}
                                %
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Regra Aplicada */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 border-b pb-2 flex items-center">
                            <Settings className="w-4 h-4 mr-1.5" />
                            Lógica de Precificação
                          </h3>

                          {(selectedInvoice.precisaAnaliseFOB ||
                            selectedInvoice.freteFallbackEmitente) && (
                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                              <strong>⚠️ Atenção requerida:</strong>
                              {selectedInvoice.freteFallbackEmitente
                                ? " Nenhuma regra específica encontrada para o pagador. Fallback automático para a tabela do emitente foi aplicado. Verifique se o valor está correto."
                                : " Tabela FOB utilizada. Confirmar se a regra de cobrança do destinatário está atualizada."}
                            </div>
                          )}

                          <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto text-xs">
                            <pre className="text-gray-700 font-mono">
                              {JSON.stringify(
                                selectedInvoice.regraAplicada,
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        </div>

                        {/* CT-e Result */}
                        {selectedInvoice.cteNumero && (
                          <div className="border border-gray-200 rounded-xl p-4 bg-blue-50/50 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-4 border-b border-blue-100 pb-2">
                              CT-e Emitido
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Número CT-e
                                </p>
                                <p className="font-semibold text-gray-900">
                                  {selectedInvoice.cteNumero}
                                </p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-xs text-gray-500 mb-1">
                                  Chave de Acesso CT-e
                                </p>
                                <p className="text-sm font-mono text-gray-700 bg-white p-2 rounded border border-gray-200 break-all">
                                  {selectedInvoice.cteChave}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {slideOverTab === "notas" && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                        {!selectedInvoice.notasInternas ||
                        selectedInvoice.notasInternas.length === 0 ? (
                          <div className="text-center text-gray-500 py-10 border border-dashed border-gray-200 rounded-xl">
                            Nenhuma nota adicionada ainda.
                          </div>
                        ) : (
                          selectedInvoice.notasInternas.map((nota) => (
                            <div
                              key={nota.id}
                              className="bg-orange-50 border border-orange-100 rounded-xl p-3"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-gray-800">
                                  {nota.user}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(nota.date).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {nota.text}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-auto bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <textarea
                          className="w-full text-sm border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:border-transparent focus:ring-[#F26522]/30 resize-none"
                          rows={3}
                          placeholder="Adicione um comentário ou nota interna..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            className="px-4 py-2 bg-[#F26522] text-white font-bold rounded-lg text-sm disabled:opacity-50"
                            disabled={!newNote.trim()}
                            onClick={() => {
                              addNoteToInvoice(
                                selectedInvoice.id,
                                newNote,
                                "Talita",
                              );
                              setNewNote("");
                              // Also update local selectedInvoice state to see re-render instantly without closing modal
                              setSelectedInvoice({
                                ...selectedInvoice,
                                notasInternas: [
                                  ...(selectedInvoice.notasInternas || []),
                                  {
                                    id: Math.random().toString(),
                                    text: newNote,
                                    date: new Date().toISOString(),
                                    user: "Talita",
                                  },
                                ],
                              });
                            }}
                          >
                            Salvar Nota
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {slideOverTab === "xml" && (
                    <div className="h-full bg-slate-900 rounded-xl p-4 overflow-auto border border-slate-700 shadow-inner">
                      <pre className="text-emerald-400 font-mono text-xs whitespace-pre-wrap word-break">
                        {selectedInvoice.xmlData ||
                          `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${selectedInvoice.chaveAcesso}" versao="4.00">
      <ide>
        <cUF>31</cUF>
        <cNF>12345678</cNF>
        <natOp>VENDAS</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${selectedInvoice.numero}</nNF>
        <dhEmi>${selectedInvoice.detectadoEm}</dhEmi>
      </ide>
      <emit>
        <CNPJ>${selectedInvoice.remetente.cnpj.replace(/\D/g, "")}</CNPJ>
        <xNome>${selectedInvoice.remetente.razaoSocial}</xNome>
        <enderEmit>
          <xMun>${selectedInvoice.remetente.cidade}</xMun>
          <UF>${selectedInvoice.remetente.uf}</UF>
        </enderEmit>
      </emit>
      <dest>
        <CNPJ>${selectedInvoice.destinatario.cnpj.replace(/\D/g, "")}</CNPJ>
        <xNome>${selectedInvoice.destinatario.razaoSocial}</xNome>
        <enderDest>
          <xMun>${selectedInvoice.destinatario.cidade}</xMun>
          <UF>${selectedInvoice.destinatario.uf}</UF>
        </enderDest>
      </dest>
      <!-- Simulated XML content due to preview -->
    </infNFe>
  </NFe>
</nfeProc>`}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
