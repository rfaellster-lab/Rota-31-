import { useState } from 'react';
import { useInvoices } from '../store/InvoiceContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../components/Layout';
import { ChevronLeft, ChevronRight, Target, Clock } from 'lucide-react';

const DAILY_GOAL = 5000;

export default function CalendarView() {
  const { invoices } = useInvoices();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  // Get emitted invoices for calendar logic
  const validInvoices = invoices.filter(inv => inv.status !== 'erro');

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Calendar Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-gray-200 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              <Target className="w-4 h-4 text-[#F26522]" />
              Meta Diária: R$ 5.000,00
            </div>
          </div>
          <div className="flex space-x-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Content wrapper for mobile scroll */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 border-b border-gray-200">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">

          
          {/* Empty days padding */}
          {Array.from({ length: days[0].getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-50 min-h-[140px] opacity-40"></div>
          ))}

          {/* Days */}
          {days.map((day) => {
            // Standard invoices (detected on this day)
            const dayInvoices = validInvoices.filter(inv => isSameDay(parseISO(inv.detectadoEm), day));
            // Snoozed to this day
            const snoozedToDay = invoices.filter(inv => inv.snoozeUntil && isSameDay(parseISO(inv.snoozeUntil), day));
            
            const totalValue = dayInvoices.reduce((acc, curr) => acc + curr.valorNota, 0);
            const goalPercentage = Math.min((totalValue / DAILY_GOAL) * 100, 100);
            
            // Count by status
            const emitidas = dayInvoices.filter(i => i.status === 'emitida').length;
            const aprovadas = dayInvoices.filter(i => i.status === 'aprovada').length;
            const pendentes = dayInvoices.filter(i => i.status === 'pendente' && !i.snoozeUntil).length;

            const isWeekendDay = isWeekend(day);
            const hasData = dayInvoices.length > 0 || snoozedToDay.length > 0;

            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "min-h-[140px] p-2 relative group flex flex-col",
                  isWeekendDay ? "bg-slate-50 border-t-2 border-t-transparent hover:bg-slate-100" : "bg-white hover:bg-orange-50/30 transition-colors"
                )}
              >
                {/* Weekend indicator band */}
                {isWeekendDay && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200"></div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full z-10",
                    isToday(day) ? "bg-[#F26522] text-white shadow-md shadow-orange-500/20" : isWeekendDay ? "text-slate-400" : "text-slate-700 group-hover:bg-orange-100 group-hover:text-orange-800"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {isWeekendDay && <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">SLA PAUSA</span>}
                </div>
                
                {hasData && (
                  <div className="flex-1 flex flex-col justify-end space-y-2 mt-auto">
                    
                    {dayInvoices.length > 0 && (
                       <>
                         {/* Mini-graphic / Status Bars */}
                         <div className="flex flex-col gap-1 w-full mt-2">
                           {emitidas > 0 && (
                             <div className="flex items-center gap-1 group/tooltip relative">
                               <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.min(emitidas * 5, 100)}%`, minWidth: '4px' }}></div>
                               <span className="text-[10px] text-blue-700 font-medium leading-none">{emitidas}</span>
                             </div>
                           )}
                           {aprovadas > 0 && (
                             <div className="flex items-center gap-1">
                               <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${Math.min(aprovadas * 5, 100)}%`, minWidth: '4px' }}></div>
                               <span className="text-[10px] text-emerald-700 font-medium leading-none">{aprovadas}</span>
                             </div>
                           )}
                           {pendentes > 0 && (
                             <div className="flex items-center gap-1">
                               <div className="h-1.5 bg-yellow-500 rounded-full animate-pulse" style={{ width: `${Math.min(pendentes * 5, 100)}%`, minWidth: '4px' }}></div>
                               <span className="text-[10px] text-yellow-700 font-medium leading-none">{pendentes}</span>
                             </div>
                           )}
                         </div>

                         {/* Meta line */}
                         <div className="mt-1 flex flex-col gap-0.5">
                           <div className="flex justify-between items-end">
                             <span className="text-[11px] font-bold text-slate-800">
                               {new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short", style: "currency", currency: "BRL" }).format(totalValue)}
                             </span>
                             <span className="text-[9px] text-slate-400 font-medium border border-slate-200 px-1 rounded-sm bg-white">{Math.round(goalPercentage)}%</span>
                           </div>
                           <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div 
                               className={cn("h-full rounded-full transition-all duration-500", goalPercentage >= 100 ? "bg-emerald-500" : "bg-[#F26522]")} 
                               style={{ width: `${goalPercentage}%` }}
                             />
                           </div>
                         </div>
                       </>
                    )}

                    {/* Snoozed Invoices marker */}
                    {snoozedToDay.length > 0 && (
                       <div className="flex items-center gap-1 mt-1 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] text-indigo-700 font-semibold shadow-sm w-max self-end mb-1">
                         <Clock className="w-3 h-3 text-indigo-500" />
                         {snoozedToDay.length} Adiadas
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
