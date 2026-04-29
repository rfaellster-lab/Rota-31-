import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Invoice } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardChartsProps {
  invoices: Invoice[];
}

const STATUS_COLORS = {
  pendente: '#f59e0b',
  aprovada: '#10b981',
  emitida: '#3b82f6',
  negada: '#9ca3af',
  erro: '#ef4444'
};

const STATUS_NAMES = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  emitida: 'Emitida',
  negada: 'Negada',
  erro: 'Com Erro'
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ invoices }) => {
  // Process data for Area Chart (Invoices by date)
  const invoicesByDate = invoices.reduce((acc, inv) => {
    const date = inv.detectadoEm.split('T')[0];
    if (!acc[date]) {
      acc[date] = { date: format(parseISO(inv.detectadoEm), 'dd/MM', { locale: ptBR }), aprovadas: 0, emitidas: 0, pendentes: 0 };
    }
    if (inv.status === 'aprovada') acc[date].aprovadas += 1;
    if (inv.status === 'emitida') acc[date].emitidas += 1;
    if (inv.status === 'pendente') acc[date].pendentes += 1;
    return acc;
  }, {} as Record<string, {date: string, aprovadas: number, emitidas: number, pendentes: number}>);

  const areaData = Object.values(invoicesByDate).sort((a, b) => {
    // Basic string sort works for yyyy-mm-dd but not dd/MM. We should sort by the original keys.
    return 0; // The actual keys sorting is better below
  });

  const sortedKeys = Object.keys(invoicesByDate).sort();
  const sortedAreaData = sortedKeys.map(key => invoicesByDate[key]);

  // Process data for Pie Chart (Status Distribution)
  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_NAMES[status as keyof typeof STATUS_NAMES] || status,
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#cbd5e1'
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      {/* Area Chart */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Evolução de Auditoria (por dia)</h3>
        <div className="flex-1 min-h-0 w-full relative -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedAreaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAprovadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEmitidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPendentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip 
                 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" name="Emitidas" dataKey="emitidas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEmitidas)" />
              <Area type="monotone" name="Aprovadas" dataKey="aprovadas" stroke="#10b981" fillOpacity={1} fill="url(#colorAprovadas)" />
              <Area type="monotone" name="Pendentes" dataKey="pendentes" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPendentes)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Volume por Status</h3>
        <div className="flex-1 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend 
                layout="horizontal" 
                verticalAlign="bottom" 
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', marginTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
