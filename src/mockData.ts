import { Invoice } from './types';
import { subDays, subHours, subMinutes, formatISO } from 'date-fns';

const generateMockData = (): Invoice[] => {
  const clients = [
    { name: 'JORLAN COMERCIAL', cnpj: '01.542.240/0016-67', city: 'Governador Valadares' },
    { name: 'BAMAQ S/A', cnpj: '17.371.493/0001-38', city: 'Belo Horizonte' },
    { name: 'SUDESTE LTDA', cnpj: '05.213.987/0001-55', city: 'Ipatinga' },
    { name: 'VALENCE AUTO TREK', cnpj: '21.344.590/0001-12', city: 'Belo Horizonte' },
    { name: 'COFERMETA', cnpj: '16.711.233/0001-99', city: 'Contagem' },
    { name: 'RGS LOGISTICA', cnpj: '08.911.344/0001-88', city: 'Betim' },
    { name: 'SICAR AUTOMOTIVA', cnpj: '11.222.333/0001-77', city: 'Governador Valadares' },
    { name: 'BR FRANCE', cnpj: '45.111.999/0001-66', city: 'Vitória' },
  ];

  const now = new Date();
  const invoices: Invoice[] = [];

  const getStatus = (i: number) => {
    if (i < 5) return 'pendente';
    if (i < 25) return 'aprovada';
    if (i < 28) return 'negada';
    if (i < 46) return 'emitida';
    if (i < 48) return 'erro';
    return 'cancelada';
  };

  for (let i = 0; i < 50; i++) {
    const status = getStatus(i);
    const isPendente = status === 'pendente';
    
    // Dates strategy
    // Pendentes very recent (mins/hours ago)
    // Emitidas/Aprovadas across last 30 days, heavily clustered in last 24h
    let detectadoDate: Date;
    let emitidoDate: Date | null = null;
    let aprovadoDate: Date | null = null;
    
    if (isPendente) {
      detectadoDate = subMinutes(now, Math.floor(Math.random() * 120)); // Last 2 hours
    } else {
      const daysAgo = i < 30 ? 0 : Math.floor(Math.random() * 30) + 1;
      const hoursAgo = Math.floor(Math.random() * 24);
      detectadoDate = subHours(subDays(now, daysAgo), hoursAgo);
      
      aprovadoDate = subMinutes(detectadoDate, -15); // Approved 15 mins after detected
      if (status === 'emitida' || status === 'cancelada') {
        emitidoDate = subMinutes(aprovadoDate, -5); // Emitted 5 mins after approved
      }
    }

    const valorNota = Math.floor(Math.random() * (50000 - 500 + 1) + 500);
    const percentualFrete = 0.035;
    const valorFrete = Math.max(60, valorNota * percentualFrete);
    const isFOB = Math.random() > 0.6; // 40% FOB
    
    // Specific business rules requested:
    const precisaAnaliseFOB = i === 1 || i === 3 || i === 7;
    const freteFallbackEmitente = i === 2 || i === 4;

    const remetenteIndex = Math.floor(Math.random() * clients.length);
    let destIndex = Math.floor(Math.random() * clients.length);
    while (destIndex === remetenteIndex) destIndex = (destIndex + 1) % clients.length;
    
    const remetenteClient = clients[remetenteIndex];
    const destClient = clients[destIndex];
    
    const pagador = isFOB ? 'DESTINATARIO' : 'REMETENTE';

    invoices.push({
      id: `inv-${1000 + i}`,
      chaveAcesso: `312604${remetenteClient.cnpj.replace(/\D/g, '')}5500100${123456 + i}10000${123 + i}4`,
      numero: `${123456 + i}`,
      remetente: {
        razaoSocial: remetenteClient.name,
        cnpj: remetenteClient.cnpj,
        cidade: remetenteClient.city,
        uf: 'MG'
      },
      destinatario: {
        razaoSocial: destClient.name,
        cnpj: destClient.cnpj,
        cidade: destClient.city,
        uf: 'MG'
      },
      valorNota,
      valorFrete,
      percentualFrete,
      tipoFrete: isFOB ? 'FOB' : 'CIF',
      modFrete: '0',
      pagador,
      regraAplicada: {
        tipoBusca: 'CNPJ',
        valorBusca: pagador === 'REMETENTE' ? remetenteClient.cnpj : destClient.cnpj,
        nomeCliente: pagador === 'REMETENTE' ? remetenteClient.name : destClient.name,
        valorMinimo: 60.00,
        porcentagem: 0.035,
        motivo: `CNPJ:${pagador}`
      },
      status,
      freteFallbackEmitente,
      precisaAnaliseFOB,
      isFOB,
      detectadoEm: formatISO(detectadoDate),
      aprovadoEm: aprovadoDate ? formatISO(aprovadoDate) : null,
      emitidoEm: emitidoDate ? formatISO(emitidoDate) : null,
      aprovadoPor: aprovadoDate ? 'Talita' : null,
      cteNumero: status === 'emitida' ? `${8000 + i}` : null,
      cteChave: status === 'emitida' ? `31260411222333000177570010000${8000 + i}10000${800 + i}4` : null,
      erroMsg: status === 'erro' ? 'Rejeição: CNPJ do destinatário inválido na SEFAZ' : null,
    });
  }

  return invoices;
}

export const initialInvoices = generateMockData();
