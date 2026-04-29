import { createContext, useContext, useState, ReactNode } from 'react';
import { initialInvoices } from '../mockData';
import { Invoice } from '../types';
import { DateRange } from '../components/DateRangePicker';

interface InvoiceContextType {
  invoices: Invoice[];
  approveInvoice: (id: string, user: string) => void;
  denyInvoice: (id: string, num: string) => void;
  emitInvoice: (id: string) => void;
  bulkApproveInvoices: (ids: string[], user: string) => void;
  addNoteToInvoice: (id: string, noteText: string, user: string) => void;
  snoozeInvoice: (id: string, date: string) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  globalDateRange: DateRange;
  setGlobalDateRange: (range: DateRange) => void;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider = ({ children }: { children: ReactNode }) => {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [globalDateRange, setGlobalDateRange] = useState<DateRange>({
    label: 'Hoje',
    from: new Date(),
    to: new Date()
  });

  const approveInvoice = (id: string, user: string) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, status: 'aprovada', aprovadoPor: user, aprovadoEm: new Date().toISOString() } : inv
    ));
  };

  const denyInvoice = (id: string, reason: string) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, status: 'negada', erroMsg: reason } : inv
    ));
  };

  const emitInvoice = (id: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        return { 
          ...inv, 
          status: 'emitida', 
          emitidoEm: new Date().toISOString(),
          cteNumero: `${Math.floor(Math.random() * 10000)}`,
          cteChave: `312604${inv.remetente.cnpj.replace(/\D/g, '')}570010000${Math.floor(Math.random() * 1000)}1000000${Math.floor(Math.random() * 10)}4`
        };
      }
      return inv;
    }));
  };

  const bulkApproveInvoices = (ids: string[], user: string) => {
    setInvoices(prev => prev.map(inv => 
      ids.includes(inv.id) && inv.status === 'pendente' 
        ? { ...inv, status: 'aprovada', aprovadoPor: user, aprovadoEm: new Date().toISOString() } 
        : inv
    ));
  };

  const addNoteToInvoice = (id: string, noteText: string, user: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const newNote = {
          id: Math.random().toString(36).substr(2, 9),
          text: noteText,
          date: new Date().toISOString(),
          user: user
        };
        return {
          ...inv,
          notasInternas: [...(inv.notasInternas || []), newNote]
        };
      }
      return inv;
    }));
  };

  const snoozeInvoice = (id: string, date: string) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, snoozeUntil: date } : inv
    ));
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, ...updates } : inv
    ));
  };

  return (
    <InvoiceContext.Provider value={{ invoices, approveInvoice, denyInvoice, emitInvoice, bulkApproveInvoices, addNoteToInvoice, snoozeInvoice, updateInvoice, globalDateRange, setGlobalDateRange }}>
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoices = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoices must be used within an InvoiceProvider');
  }
  return context;
};
