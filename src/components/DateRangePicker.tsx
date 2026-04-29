import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { 
  format, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isSameDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from './Layout';

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
  label: string;
};

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = new Date();

  const presets = [
    { label: 'Hoje', from: today, to: today },
    { label: 'Ontem', from: subDays(today, 1), to: subDays(today, 1) },
    { label: 'Últimos 7 dias', from: subDays(today, 6), to: today },
    { label: 'Últimos 14 dias', from: subDays(today, 13), to: today },
    { label: 'Últimos 28 dias', from: subDays(today, 27), to: today },
    { label: 'Últimos 30 dias', from: subDays(today, 29), to: today },
    { label: 'Este mês', from: startOfMonth(today), to: endOfMonth(today) },
    { label: 'Mês passado', from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
    { label: 'Últimos 3 meses', from: startOfMonth(subMonths(today, 3)), to: endOfMonth(today) },
    { label: 'Período máximo', from: undefined, to: undefined }
  ];

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, "d 'de' MMM, yyyy", { locale: ptBR });
  };

  const getDisplayValue = () => {
    if (value.label) return value.label;
    if (!value.from && !value.to) return 'Período máximo';
    if (value.from && !value.to) return `A partir de ${formatDate(value.from)}`;
    if (!value.from && value.to) return `Até ${formatDate(value.to)}`;
    if (isSameDay(value.from!, value.to!)) return formatDate(value.from);
    return `${formatDate(value.from)} - ${formatDate(value.to)}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors h-[34px]"
      >
        <CalendarIcon className="w-4 h-4 text-slate-400" />
        <span className="min-w-[120px] text-left">{getDisplayValue()}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-[99999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 flex flex-col max-h-[400px] overflow-y-auto bg-white relative z-[99999]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2">Presets do Meta Ads</span>
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onChange(preset);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors text-left",
                  value.label === preset.label
                    ? "bg-[#F26522]/10 text-[#F26522] font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <span>{preset.label}</span>
                {value.label === preset.label && <Check className="w-4 h-4 text-[#F26522]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
