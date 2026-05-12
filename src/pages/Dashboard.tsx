import React, { useState, useEffect, useMemo, useRef } from "react";
import { useInvoices } from "../store/InvoiceContext";
import { useAuth } from "../store/AuthContext";
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
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { useToast } from "../stores/useToastStore";
import { EmptyState, EmptyStatePresets } from "../components/molecules/EmptyState";
import { useKeyboardShortcuts } from "../lib/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "../components/organisms/KeyboardShortcutsHelp";
import { QuickFilterBar, Clock as QFClock, AlertTriangle as QFAlert, CheckCircle2 as QFCheck, XCircle as QFX, Layers as QFLayers } from "../components/molecules/QuickFilterBar";
import { BulkApproveDialog } from "../components/organisms/BulkApproveDialog";

/**
 * Converte código de motivo de alerta em label legível para o usuário.
 * @story Editar frete + alerta visual (Onda 2)
 * @agent @aios-master
 */
function motivoToLabel(motivo: string, inv: Invoice): string {
  switch (motivo) {
    case "freteAcimaThreshold": {
      const pct =
        inv.valorNota > 0
          ? Math.round((inv.valorFrete / inv.valorNota) * 100)
          : 0;
      return `Frete acima de 20% do valor da NF (atual: ${pct}%)`;
    }
    case "freteZeroOuNegativo":
      return "Frete calculado como zero ou negativo";
    case "semRegra":
      return "Sem regra de frete cadastrada para este cliente";
    case "semEndereco":
      return "Sem endereço de destino válido";
    case "pagadorIndefinido":
      return "Pagador do frete não identificado";
    default:
      return motivo;
  }
}

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
  const { user } = useAuth();
  const toast = useToast();
  const userLabel = user?.displayName || user?.email || "Usuário";
  const [searchTerm, setSearchTerm] = useState("");
  // Default = pendentes (foco do Dashboard é decidir, histórico fica em /historico)
  const [statusFilter, setStatusFilter] = useState<string>("pendente");
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

  // Onda 2 — edição de frete + motivo obrigatório
  const [valorFreteLocal, setValorFreteLocal] = useState<number>(0);
  const [motivoEdicao, setMotivoEdicao] = useState<string>("");
  const [motivoOutroTexto, setMotivoOutroTexto] = useState<string>("");

  // Paginação da tabela principal
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // S1-03 — Navegação por teclado
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [focusedRowIdx, setFocusedRowIdx] = useState(-1);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // S1-06 — Bulk approve dialog
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);

  // Reset states locais quando muda a invoice selecionada
  useEffect(() => {
    if (selectedInvoice) {
      setValorFreteLocal(selectedInvoice.valorFrete);
      setMotivoEdicao("");
      setMotivoOutroTexto("");
    }
  }, [selectedInvoice?.id]);

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
  const filtered = useMemo(() => periodInvoices
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
    ), [periodInvoices, statusFilter, pagadorFilter, searchTerm]);

  // Paginação derivada
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Reset page quando filtros mudam
  useEffect(() => { setCurrentPage(1); }, [statusFilter, pagadorFilter, searchTerm, globalDateRange, pageSize]);

  // S1-05 — Quick filter presets (computados a partir de periodInvoices)
  const quickFilterPresets = useMemo(() => {
    const isPendente = (i: Invoice) => i.status === 'pendente';
    const hasAlert = (i: Invoice) =>
      !!i.temAlerta || (i.motivosAlerta && i.motivosAlerta.length > 0);
    const pendentesCount = periodInvoices.filter(isPendente).length;
    const comAlertaCount = periodInvoices.filter((i) => isPendente(i) && hasAlert(i)).length;
    const aprovadasCount = periodInvoices.filter((i) => i.status === 'aprovada').length;
    const emitidasCount = periodInvoices.filter((i) => i.status === 'emitida').length;
    const negadasCount = periodInvoices.filter((i) => i.status === 'negada' || i.status === 'cancelada' || i.status === 'denegada').length;

    const isAll = statusFilter === 'todos';
    return [
      {
        id: 'pendente',
        label: 'Pendentes',
        count: pendentesCount,
        icon: QFClock,
        color: 'orange' as const,
        active: statusFilter === 'pendente' && pagadorFilter === 'todos',
      },
      {
        id: 'com_alerta',
        label: 'Com alerta',
        count: comAlertaCount,
        icon: QFAlert,
        color: 'amber' as const,
        active: false, // alerta é filtro derivado, não é status puro
      },
      {
        id: 'aprovada',
        label: 'Aprovadas',
        count: aprovadasCount,
        icon: QFCheck,
        color: 'emerald' as const,
        active: statusFilter === 'aprovada',
      },
      {
        id: 'emitida',
        label: 'Emitidas',
        count: emitidasCount,
        icon: QFCheck,
        color: 'emerald' as const,
        active: statusFilter === 'emitida',
      },
      {
        id: 'negada',
        label: 'Negadas',
        count: negadasCount,
        icon: QFX,
        color: 'rose' as const,
        active: statusFilter === 'negada',
      },
      {
        id: 'todos',
        label: 'Todas',
        count: periodInvoices.length,
        icon: QFLayers,
        color: 'slate' as const,
        active: isAll,
      },
    ];
  }, [periodInvoices, statusFilter, pagadorFilter]);

  const applyQuickFilter = (id: string) => {
    setSearchTerm('');
    setPagadorFilter('todos');
    if (id === 'com_alerta') {
      // "Com alerta" = pendentes + filtro derivado. Mostramos apenas pendentes
      // e o usuário identifica visualmente os com alerta (badge na linha).
      setStatusFilter('pendente');
      toast.info('Pendentes com alerta destacados na lista', { durationMs: 3500 });
    } else {
      setStatusFilter(id);
    }
  };

  // S1-03 — Atalhos de teclado pro Dashboard (alvo: NFs/hora 60 → 80+)
  // Não dispara quando usuário está digitando em inputs (default do hook).
  // Esc, /, ? funcionam mesmo quando modais estão abertos.
  const modalOpen = !!selectedInvoice || isDenyModalOpen || showShortcutsHelp;
  useKeyboardShortcuts([
    {
      key: '/',
      description: 'Focar campo de busca',
      handler: (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      },
    },
    {
      key: '?',
      shift: true,
      description: 'Mostrar atalhos',
      handler: () => setShowShortcutsHelp(true),
    },
    {
      key: 'Escape',
      allowInInput: true,
      description: 'Fechar modal / limpar foco',
      handler: () => {
        if (showShortcutsHelp) { setShowShortcutsHelp(false); return; }
        if (isDenyModalOpen) { setIsDenyModalOpen(false); return; }
        if (selectedInvoice) { setSelectedInvoice(null); return; }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      },
    },
    {
      key: 'j',
      disabled: modalOpen,
      description: 'Próxima nota (lista)',
      handler: (e) => {
        e.preventDefault();
        setFocusedRowIdx((i) => Math.min(i + 1, pageItems.length - 1));
      },
    },
    {
      key: 'k',
      disabled: modalOpen,
      description: 'Nota anterior (lista)',
      handler: (e) => {
        e.preventDefault();
        setFocusedRowIdx((i) => Math.max(i - 1, 0));
      },
    },
    {
      key: 'Enter',
      disabled: !modalOpen && focusedRowIdx < 0,
      allowInInput: false,
      description: 'Abrir nota focada',
      handler: (e) => {
        if (modalOpen) return;
        const inv = pageItems[focusedRowIdx];
        if (inv) {
          e.preventDefault();
          setSelectedInvoice(inv);
        }
      },
    },
    {
      key: 'a',
      disabled: !selectedInvoice || selectedInvoice.status !== 'pendente',
      description: 'Aprovar nota aberta',
      handler: (e) => {
        if (!selectedInvoice || selectedInvoice.status !== 'pendente') return;
        e.preventDefault();
        // Não confirma valor editado via atalho — força usar botão se houve edição.
        if (valorFreteLocal !== selectedInvoice.valorFrete) {
          toast.warn('Você editou o valor — use o botão Aprovar pra confirmar.');
          return;
        }
        approveInvoice(selectedInvoice.id, userLabel);
        setSelectedInvoice(null);
        toast.success('Nota aprovada (A)');
      },
    },
    {
      key: 'n',
      disabled: !selectedInvoice || selectedInvoice.status !== 'pendente',
      description: 'Negar nota aberta',
      handler: (e) => {
        if (!selectedInvoice || selectedInvoice.status !== 'pendente') return;
        e.preventDefault();
        setInvoiceToDeny(selectedInvoice.id);
        setIsDenyModalOpen(true);
      },
    },
  ]);

  // Reset foco quando filtros mudam (lista vira outra)
  useEffect(() => { setFocusedRowIdx(-1); }, [statusFilter, pagadorFilter, searchTerm, currentPage]);

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
      setSelectedIds(new Set(pageItems.map((i) => i.id)));
    }
  };

  // S1-06 — Lógica antiga (sem dialog) — mantida pra fluxo rápido sem confirmação?
  // Não. Sempre passa pelo dialog. Botão dispara abertura do modal.
  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    setBulkApproveOpen(true);
  };

  // Confirmação do dialog — recebe lista filtrada (após exclude alerted)
  const handleBulkApproveConfirm = async (ids: string[]) => {
    if (ids.length === 0) {
      toast.warn('Nenhuma nota pra aprovar.');
      setBulkApproveOpen(false);
      return;
    }
    try {
      await bulkApproveInvoices(ids, userLabel);
      const skipped = selectedIds.size - ids.length;
      if (skipped > 0) {
        toast.success(
          `${ids.length} ${ids.length === 1 ? 'nota aprovada' : 'notas aprovadas'} — ${skipped} pulada${skipped > 1 ? 's' : ''} (com alerta)`,
        );
      } else {
        toast.success(`${ids.length} ${ids.length === 1 ? 'nota aprovada' : 'notas aprovadas'}`);
      }
      setSelectedIds(new Set());
      setBulkApproveOpen(false);
    } catch (e: any) {
      toast.error(`Erro no bulk approve: ${e?.message || 'tente novamente'}`);
    }
  };

  const selectedInvoicesForBulk = useMemo(
    () => pageItems.filter((i) => selectedIds.has(i.id)),
    [pageItems, selectedIds],
  );

  const handleApprove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    approveInvoice(id, userLabel);
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

      {/* Resumo enxuto pra emissão (só pendentes em destaque) */}
      <div className="col-span-2 md:col-span-12 bg-gradient-to-r from-orange-50 via-white to-white rounded-2xl px-5 py-3 shadow-sm border border-orange-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-black text-[#F26522]">{pending.length}</div>
          <div>
            <p className="text-xs font-bold text-orange-700 uppercase tracking-widest">Notas pendentes</p>
            <p className="text-[11px] text-slate-500">Aguardando sua decisão de aprovação</p>
          </div>
        </div>
        {errorInvoices.length > 0 && (
          <div className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
            ⚠ {errorInvoices.length} com erro
          </div>
        )}
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
            <option value="negada">Status: Negada</option>
            <option value="cancelada">Status: Cancelada</option>
            <option value="denegada">Status: Denegada</option>
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
        <div className="flex-1 max-w-md w-full md:ml-4" data-tour="search">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por NF-e, CNPJ ou Razão Social…  (atalho: / )"
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar notas (atalho: barra)"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* S1-05 — Quick filter chips */}
      <div className="col-span-2 md:col-span-12 px-2 mt-1 mb-1" data-tour="quick-filters">
        <QuickFilterBar filters={quickFilterPresets} onSelect={applyQuickFilter} />
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
                  <td colSpan={9} className="p-0">
                    {searchTerm.trim() ? (
                      <EmptyState {...EmptyStatePresets.noSearchResults(searchTerm)} />
                    ) : statusFilter === 'pendente' ? (
                      <EmptyState {...EmptyStatePresets.noPendingApprovals()} />
                    ) : (
                      <EmptyState
                        title="Nada nesse filtro"
                        description="Ajuste o status, o período ou a busca pra ver outras notas."
                      />
                    )}
                  </td>
                </tr>
              ) : (
                pageItems.map((inv, rowIdx) => {
                  const isPending = inv.status === "pendente";
                  const isFocused = rowIdx === focusedRowIdx;

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
                        isFocused && "ring-2 ring-inset ring-[#F26522]",
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800">
                            {inv.numero}
                          </span>
                          {inv.temAlerta && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300"
                              title="Esta nota tem validações disparadas. Veja detalhes."
                            >
                              <AlertTriangle className="w-3 h-3" />
                              ATENÇÃO
                            </span>
                          )}
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

        {/* Paginação */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <span>
                Mostrando <span className="font-bold text-slate-900">{startIdx + 1}</span> a <span className="font-bold text-slate-900">{endIdx}</span> de <span className="font-bold text-slate-900">{totalItems.toLocaleString('pt-BR')}</span> notas
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
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
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

                        {selectedInvoice.status === "pendente" && (() => {
                          const valorMudou =
                            valorFreteLocal !== selectedInvoice.valorFrete;
                          const motivoFinal =
                            motivoEdicao === "outro"
                              ? motivoOutroTexto.trim()
                              : motivoEdicao;
                          const aprovacaoBloqueada =
                            valorMudou && !motivoFinal;
                          return (
                            <>
                              {/* Dropdown obrigatório de motivo (só aparece quando valor mudou) */}
                              {valorMudou && (
                                <div className="mt-4 space-y-2 bg-white/60 rounded-lg p-3 border border-orange-200">
                                  <label
                                    htmlFor="motivo-edicao-frete"
                                    className="text-xs font-bold text-slate-700 uppercase tracking-wide block"
                                  >
                                    Motivo da edição (obrigatório)
                                  </label>
                                  <select
                                    id="motivo-edicao-frete"
                                    aria-label="Motivo da edição do valor do frete"
                                    value={motivoEdicao}
                                    onChange={(e) =>
                                      setMotivoEdicao(e.target.value)
                                    }
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                                  >
                                    <option value="">Selecione...</option>
                                    <option value="frete_real_diferente">
                                      Frete real diferente do calculado
                                    </option>
                                    <option value="valor_baixo_peca">
                                      Peça de valor baixo, frete proporcional
                                    </option>
                                    <option value="seguradora">
                                      Nota de seguradora, frete combinado à
                                      parte
                                    </option>
                                    <option value="acordo_cliente">
                                      Acordo específico com o cliente
                                    </option>
                                    <option value="erro_regra">
                                      Regra cadastrada incorreta
                                    </option>
                                    <option value="outro">Outro</option>
                                  </select>
                                  {motivoEdicao === "outro" && (
                                    <textarea
                                      aria-label="Descreva o motivo da edição"
                                      placeholder="Descreva o motivo..."
                                      value={motivoOutroTexto}
                                      onChange={(e) =>
                                        setMotivoOutroTexto(e.target.value)
                                      }
                                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none min-h-[60px] resize-y"
                                    />
                                  )}
                                </div>
                              )}

                              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                <button
                                  onClick={() => {
                                    if (valorMudou && !motivoFinal) {
                                      toast.warn("Selecione o motivo da edição antes de aprovar.");
                                      return;
                                    }
                                    approveInvoice(
                                      selectedInvoice.id,
                                      userLabel,
                                      valorMudou
                                        ? {
                                            valorFreteOverride:
                                              valorFreteLocal,
                                            motivoOverride: motivoFinal,
                                          }
                                        : undefined,
                                    );
                                    setSelectedInvoice(null);
                                  }}
                                  disabled={aprovacaoBloqueada}
                                  aria-label={
                                    valorMudou
                                      ? `Aprovar com novo frete de ${formatMoney(valorFreteLocal)}`
                                      : "Aprovar emissão"
                                  }
                                  className={cn(
                                    "w-full sm:flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                                    valorMudou
                                      ? "bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400"
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-400",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                  )}
                                >
                                  {valorMudou
                                    ? `Aprovar com novo frete (${formatMoney(valorFreteLocal)})`
                                    : "Aprovar Emissão"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    handleDenyClick(selectedInvoice.id, e);
                                    setSelectedInvoice(null);
                                  }}
                                  className="w-full sm:w-auto px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 font-medium transition-colors flex justify-center"
                                >
                                  Negar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const tomorrow = new Date();
                                    tomorrow.setDate(
                                      tomorrow.getDate() + 1,
                                    );
                                    snoozeInvoice(
                                      selectedInvoice.id,
                                      tomorrow.toISOString(),
                                    );
                                    setSelectedInvoice(null);
                                  }}
                                  className="w-full sm:w-auto px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 font-medium transition-colors flex justify-center whitespace-nowrap"
                                >
                                  Adiar (Amanhã)
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Onda 2 — Bloco visual de Alertas (validações disparadas) */}
                      {selectedInvoice.temAlerta &&
                        selectedInvoice.motivosAlerta &&
                        selectedInvoice.motivosAlerta.length > 0 && (
                          <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 my-4">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-5 h-5 text-orange-600" />
                              <h3 className="text-sm font-bold text-orange-900">
                                Atenção: validações disparadas
                              </h3>
                            </div>
                            <ul className="space-y-1">
                              {selectedInvoice.motivosAlerta.map((motivo) => (
                                <li
                                  key={motivo}
                                  className="text-sm text-orange-800 flex items-start gap-2"
                                >
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />
                                  <span>
                                    {motivoToLabel(motivo, selectedInvoice)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <p className="text-xs text-orange-700 mt-3 italic">
                              Você pode aprovar mesmo assim ou editar o valor
                              do frete antes de aprovar.
                            </p>
                          </div>
                        )}

                      {/* Onda 2 — Audit trail: edição anterior */}
                      {selectedInvoice.editadoPor && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 -mt-2">
                          <Pencil className="w-3 h-3" />
                          <span>
                            Editado por {selectedInvoice.editadoPor} em{" "}
                            {selectedInvoice.editadoEm
                              ? new Date(
                                  selectedInvoice.editadoEm,
                                ).toLocaleString("pt-BR")
                              : "—"}
                          </span>
                          {selectedInvoice.motivoEdicao && (
                            <span className="ml-1 italic">
                              ({selectedInvoice.motivoEdicao})
                            </span>
                          )}
                        </div>
                      )}

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

                        {/* Endereço de Entrega Real (essencial pra notas de seguradora) */}
                        {(selectedInvoice as any).enderecoEntrega &&
                          ((selectedInvoice as any).enderecoEntrega.fonte === "BLOCO_ENTREGA" ||
                            (selectedInvoice as any).enderecoEntrega.fonte === "INFO_COMPLEMENTAR") && (
                            <div className="border border-amber-200 rounded-xl p-4 bg-amber-50 shadow-sm">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Endereço de Entrega Real
                                <span className="ml-auto bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full normal-case">
                                  {(selectedInvoice as any).enderecoEntrega.fonte === "BLOCO_ENTREGA"
                                    ? "Bloco <entrega> do XML"
                                    : "Informações complementares"}
                                </span>
                              </h3>
                              {(selectedInvoice as any).enderecoEntrega.nome && (
                                <p className="font-semibold text-gray-900">
                                  {(selectedInvoice as any).enderecoEntrega.nome}
                                </p>
                              )}
                              {(selectedInvoice as any).enderecoEntrega.cnpj && (
                                <p className="text-sm text-gray-600 mt-1">
                                  CNPJ: {(selectedInvoice as any).enderecoEntrega.cnpj}
                                </p>
                              )}
                              <p className="text-sm text-gray-700 mt-1">
                                {[(selectedInvoice as any).enderecoEntrega.logradouro, (selectedInvoice as any).enderecoEntrega.numero]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                              {(selectedInvoice as any).enderecoEntrega.bairro && (
                                <p className="text-sm text-gray-700">
                                  Bairro: {(selectedInvoice as any).enderecoEntrega.bairro}
                                </p>
                              )}
                              <p className="text-sm text-gray-700">
                                {(selectedInvoice as any).enderecoEntrega.municipio} - {(selectedInvoice as any).enderecoEntrega.uf}
                                {(selectedInvoice as any).enderecoEntrega.cep && ` | CEP ${(selectedInvoice as any).enderecoEntrega.cep}`}
                              </p>
                            </div>
                          )}

                        {/* Info da Carga (vendedor, placa, sinistro, pedido) */}
                        {(selectedInvoice as any).cargaInfo &&
                          ((selectedInvoice as any).cargaInfo.vendedor ||
                            (selectedInvoice as any).cargaInfo.placa ||
                            (selectedInvoice as any).cargaInfo.sinistro ||
                            (selectedInvoice as any).cargaInfo.pedido ||
                            (selectedInvoice as any).cargaInfo.condPagto) && (
                            <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                                Info da Carga
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                {(selectedInvoice as any).cargaInfo.vendedor && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Vendedor</p>
                                    <p className="text-gray-700 font-medium">{(selectedInvoice as any).cargaInfo.vendedor}</p>
                                  </div>
                                )}
                                {(selectedInvoice as any).cargaInfo.placa && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Placa</p>
                                    <p className="text-gray-700 font-mono font-medium">{(selectedInvoice as any).cargaInfo.placa}</p>
                                  </div>
                                )}
                                {(selectedInvoice as any).cargaInfo.sinistro && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sinistro</p>
                                    <p className="text-gray-700 font-medium">{(selectedInvoice as any).cargaInfo.sinistro}</p>
                                  </div>
                                )}
                                {(selectedInvoice as any).cargaInfo.pedido && (
                                  <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pedido</p>
                                    <p className="text-gray-700 font-medium">{(selectedInvoice as any).cargaInfo.pedido}</p>
                                  </div>
                                )}
                                {(selectedInvoice as any).cargaInfo.condPagto && (
                                  <div className="col-span-2 md:col-span-3">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cond. Pagto</p>
                                    <p className="text-gray-700 font-medium">{(selectedInvoice as any).cargaInfo.condPagto}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

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
                              {selectedInvoice.status === "pendente" ? (
                                <div className="space-y-1">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold pointer-events-none">
                                      R$
                                    </span>
                                    <input
                                      type="number"
                                      aria-label="Valor do frete (editável)"
                                      className={cn(
                                        "w-full pl-7 pr-2 py-1.5 text-sm rounded-lg bg-white focus:outline-none focus:ring-2 transition-colors",
                                        valorFreteLocal !==
                                          selectedInvoice.valorFrete
                                          ? "border-2 border-orange-400 focus:ring-orange-200"
                                          : "border border-gray-300 focus:ring-[#F26522]/30 focus:border-[#F26522]",
                                      )}
                                      value={valorFreteLocal}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setValorFreteLocal(
                                          isNaN(v) ? 0 : v,
                                        );
                                      }}
                                      step="0.01"
                                      min="0"
                                    />
                                  </div>
                                  {valorFreteLocal !==
                                    selectedInvoice.valorFrete && (
                                    <p className="text-[11px] text-orange-700 font-medium">
                                      Valor original:{" "}
                                      {formatMoney(selectedInvoice.valorFrete)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="font-bold text-primary-600">
                                  {formatMoney(selectedInvoice.valorFrete)}
                                </p>
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
                                userLabel,
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
                                    user: userLabel,
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

      {/* S1-06 — Modal de confirmação do bulk approve */}
      <BulkApproveDialog
        open={bulkApproveOpen}
        invoices={selectedInvoicesForBulk}
        onClose={() => setBulkApproveOpen(false)}
        onConfirm={handleBulkApproveConfirm}
      />

      {/* S1-03 — Modal de atalhos (abre com Shift+/) */}
      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={[
          { keys: ['/'], description: 'Focar campo de busca' },
          { keys: ['J'], description: 'Próxima nota da lista' },
          { keys: ['K'], description: 'Nota anterior da lista' },
          { keys: ['Enter'], description: 'Abrir nota focada' },
          { keys: ['A'], description: 'Aprovar nota aberta' },
          { keys: ['N'], description: 'Negar nota aberta' },
          { keys: ['Esc'], description: 'Fechar modal / limpar foco' },
          { keys: ['Shift', '?'], description: 'Mostrar este painel' },
        ]}
      />
    </div>
  );
}
