export type DocumentStatus = 'pendente' | 'aprovada' | 'negada' | 'emitida' | 'erro' | 'cancelada' | 'denegada';

export interface Company {
  razaoSocial: string;
  cnpj: string;
  cidade: string;
  uf: string;
}

export interface FreightRule {
  tipoBusca: string;
  valorBusca: string;
  nomeCliente: string;
  valorMinimo: number;
  porcentagem: number;
  motivo: string;
}

export interface Note {
  id: string;
  text: string;
  date: string;
  user: string;
}

export interface Invoice {
  id: string;
  chaveAcesso: string;
  numero: string;
  remetente: Company;
  destinatario: Company;
  valorNota: number;
  valorFrete: number;
  percentualFrete: number;
  tipoFrete: 'CIF' | 'FOB';
  modFrete: string;
  pagador: 'REMETENTE' | 'DESTINATARIO';
  regraAplicada: FreightRule;
  status: DocumentStatus;
  freteFallbackEmitente: boolean;
  precisaAnaliseFOB: boolean;
  isFOB: boolean;
  detectadoEm: string;
  aprovadoEm: string | null;
  emitidoEm: string | null;
  aprovadoPor: string | null;
  cteNumero: string | null;
  cteChave: string | null;
  erroMsg: string | null;
  notasInternas?: Note[];
  xmlData?: string;
  snoozeUntil?: string | null;
}
