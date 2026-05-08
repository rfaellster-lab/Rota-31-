/**
 * @file server/adapter.ts
 * @description Converte linha da planilha APROVACOES_PENDENTES em Invoice (schema do frontend)
 *
 * Schema da planilha (ordem das colunas A..AI):
 *   A  CHAVE
 *   B  EXEC_ID
 *   C  STATUS
 *   D  NUMERO_NFE
 *   E  REMETENTE
 *   F  DESTINATARIO
 *   G  CIDADE_ORIGEM
 *   H  CIDADE_DESTINO
 *   I  VALOR_NF
 *   J  VALOR_FRETE
 *   K  PAGADOR
 *   L  TIMESTAMP
 *   M  DADOS_JSON  ← JSON completo (nfe, calculoFrete, pagador, validacoes)
 *   N  TIMESTAMP_DECISAO
 *   ... (O+ colunas auxiliares)
 */

export function parseDadosJson(raw: string): any {
  if (!raw || typeof raw !== 'string') return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function parseNumber(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v).trim().replace(/[R$\s]/g, '');
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function inferStatus(rowStatus: string, dados: any): string {
  const s = String(rowStatus || '').toUpperCase().trim();
  if (s === 'APROVADO' || s === 'APROVADA') return 'aprovada';
  if (s === 'NEGADO' || s === 'NEGADA') return 'negada';
  if (s === 'EMITIDO' || s === 'EMITIDA') return 'emitida';
  if (s === 'ERRO') return 'erro';
  if (s === 'CANCELADO' || s === 'CANCELADA') return 'cancelada';
  if (s === 'DENEGADO' || s === 'DENEGADA') return 'denegada';
  return 'pendente';
}

/**
 * Converte uma linha da APROVACOES_PENDENTES em objeto Invoice compatível com o frontend.
 * Retorna null se a linha não tem chave (vazia/inválida).
 */
export function adaptToInvoice(row: any[], rowNumber: number): any | null {
  const chave = String(row[0] || '').trim();
  if (!chave || chave.length < 20) return null;

  const dados = parseDadosJson(String(row[12] || ''));
  const nfe = dados.nfe || {};
  const calc = dados.calculoFrete || {};
  const pagador = dados.pagador || {};
  const validacoes = dados.validacoes || {};

  const valorNota = parseNumber(row[8] || nfe.valorNota || calc.valorNota || 0);
  const valorFrete = parseNumber(row[9] || calc.valorFinal || 0);
  const percentualFrete = Number(calc.percentual || 0);

  const modFrete = String(nfe.modFrete || '').trim();
  const isFOB = modFrete === '1' || modFrete === '4';
  const tipoFrete = isFOB ? 'FOB' : 'CIF';
  const pagadorTipo = isFOB ? 'DESTINATARIO' : 'REMETENTE';

  const cnpjEmit = String(nfe.cnpjEmitente || nfe.cnpjEmit || '').replace(/\D/g, '');
  const cnpjDest = String(nfe.cnpjDestinatario || nfe.cnpjDest || '').replace(/\D/g, '');

  const fmtCnpj = (c: string) => {
    if (c.length !== 14) return c;
    return `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`;
  };

  // Flags do nosso fix (Bug 1+2 + REGRA DEFAULT)
  const regraAplicada = dados.regraFrete || {};
  const motivoMatch = String(regraAplicada.motivoEscolha || '').toUpperCase();
  const isRegraDefault = motivoMatch.includes('DEFAULT') || dados.regraDefaultAplicada === true;
  const matchPorEmitente = motivoMatch.includes(':EMITENTE') || motivoMatch.includes(':REMETENTE') || motivoMatch.includes('FALLBACK');
  const precisaAnaliseFOB = isFOB && matchPorEmitente;
  const freteFallbackEmitente = motivoMatch.includes('FALLBACK_EMITENTE') || dados.freteFallbackEmitente === true;

  const status = inferStatus(String(row[2] || ''), dados);

  return {
    id: `inv-${chave.slice(-12)}`,
    chaveAcesso: chave,
    numero: String(row[3] || nfe.numero || ''),
    rowNumber,                              // útil pra updates na planilha
    execId: String(row[1] || ''),

    remetente: {
      razaoSocial: String(row[4] || nfe.nomeEmitente || ''),
      cnpj: fmtCnpj(cnpjEmit),
      cidade: String(nfe.municipioOrigem || row[6] || ''),
      uf: String(nfe.ufOrigem || 'MG'),
    },
    destinatario: {
      razaoSocial: String(row[5] || nfe.nomeDestinatario || ''),
      cnpj: fmtCnpj(cnpjDest),
      cidade: String(nfe.municipioDestinatario || nfe.municipioEntrega || row[7] || ''),
      uf: String(nfe.ufDestinatario || nfe.ufEntrega || 'MG'),
    },

    valorNota,
    valorFrete,
    percentualFrete,
    tipoFrete,
    modFrete,
    pagador: pagadorTipo,

    regraAplicada: {
      tipoBusca: regraAplicada.tipoBusca || '',
      valorBusca: regraAplicada.valorBusca || '',
      nomeCliente: regraAplicada.nomeCliente || '',
      valorMinimo: parseNumber(regraAplicada.valorMinimo),
      porcentagem: Number(regraAplicada.porcentagem || 0),
      motivo: regraAplicada.motivoEscolha || '',
    },

    status,

    // ✅ Flags do nosso fix
    freteFallbackEmitente,
    precisaAnaliseFOB,
    isFOB,
    regraDefaultAplicada: isRegraDefault,

    // Datas
    detectadoEm: String(row[11] || new Date().toISOString()),
    aprovadoEm: row[13] && (status === 'aprovada' || status === 'emitida') ? String(row[13]) : null,
    emitidoEm: status === 'emitida' ? String(row[13] || '') : null,
    aprovadoPor: status !== 'pendente' ? 'Talita' : null,

    // CT-e (preenchido após emissão)
    cteNumero: null,
    cteChave: null,
    erroMsg: null,

    // Mensagem do WhatsApp e XML cru (úteis pra preview)
    mensagemWhats: String(row[14] || ''),
    xmlData: '',

    // Dados extras pra exibição completa no modal
    enderecoEntrega: extractEnderecoEntrega(nfe),
    cargaInfo: extractCargaInfo(nfe),

    // Onda 1 — alertas (validacoes vindas do n8n) + edição de frete
    temAlerta: dados.temAlerta === true || hasAnyAlerta(validacoes),
    motivosAlerta: dados.motivosAlerta || extractMotivosAlerta(validacoes),
    validacoes,
    valorFreteEditado: dados.valorFreteEditado || null,
    motivoEdicao: dados.motivoEdicao || null,
    editadoPor: dados.editadoPor || null,
    editadoEm: dados.editadoEm || null,

    notasInternas: [],
    snoozeUntil: null,
  };
}

function hasAnyAlerta(v: any): boolean {
  if (!v || typeof v !== 'object') return false;
  return !!(v.semRegra || v.freteZeroOuNegativo || v.freteAcimaThreshold || v.semEndereco || v.pagadorIndefinido || v.zeroOuNeg || v.acimaThreshold || v.bloqueioEndereco);
}

function extractMotivosAlerta(v: any): string[] {
  const out: string[] = [];
  if (!v || typeof v !== 'object') return out;
  if (v.semRegra) out.push('semRegra');
  if (v.freteZeroOuNegativo || v.zeroOuNeg) out.push('freteZeroOuNegativo');
  if (v.freteAcimaThreshold || v.acimaThreshold) out.push('freteAcimaThreshold');
  if (v.semEndereco || v.bloqueioEndereco) out.push('semEndereco');
  if (v.pagadorIndefinido) out.push('pagadorIndefinido');
  return out;
}

/** Extrai endereço REAL de entrega (essencial pra notas de seguradora) */
function extractEnderecoEntrega(nfe: any) {
  const blocoEntrega = nfe?.infoComplementarParsed?.dados?.blocoEntrega;
  const enderecoFinal = nfe?.infoComplementarParsed?.enderecoFinal;
  const fonte = nfe?.fonteEnderecoEntrega || enderecoFinal?.fonte || 'DESTINATARIO';

  // Prioridade: bloco <entrega> do XML (mais confiável)
  if (blocoEntrega && (blocoEntrega.logradouro || blocoEntrega.municipio)) {
    return {
      nome: blocoEntrega.nome || nfe?.nomeDestinatario || '',
      cnpj: blocoEntrega.cnpj || '',
      logradouro: blocoEntrega.logradouro || '',
      numero: blocoEntrega.numero || '',
      bairro: blocoEntrega.bairro || '',
      municipio: blocoEntrega.municipio || '',
      uf: blocoEntrega.uf || '',
      cep: blocoEntrega.cep || '',
      fonte: 'BLOCO_ENTREGA',
    };
  }

  // Fallback 1: enderecoFinal parseado do infCpl
  if (enderecoFinal && enderecoFinal.municipio) {
    return {
      nome: nfe?.nomeDestinatario || '',
      cnpj: '',
      logradouro: enderecoFinal.logradouro || '',
      numero: enderecoFinal.numero || '',
      bairro: enderecoFinal.bairro || '',
      municipio: enderecoFinal.municipio || '',
      uf: enderecoFinal.uf || '',
      cep: enderecoFinal.cep || '',
      fonte: enderecoFinal.fonte || 'INFO_COMPLEMENTAR',
    };
  }

  // Fallback 2: campos diretos
  return {
    nome: nfe?.nomeDestinatario || '',
    cnpj: '',
    logradouro: nfe?.logradouroEntrega || nfe?.logradouroDestinatario || '',
    numero: nfe?.numeroEntrega || nfe?.numeroDestinatario || '',
    bairro: nfe?.bairroEntrega || nfe?.bairroDestinatario || '',
    municipio: nfe?.municipioEntrega || nfe?.municipioDestinatario || '',
    uf: nfe?.ufEntrega || nfe?.ufDestinatario || '',
    cep: nfe?.cepEntrega || nfe?.cepDestinatario || '',
    fonte,
  };
}

/** Extrai info da carga do infCpl (vendedor, placa, sinistro, pedido) */
function extractCargaInfo(nfe: any) {
  const cpl = String(nfe?.infoComplementar || '');
  const m = (re: RegExp) => { const x = cpl.match(re); return x ? x[1].trim() : ''; };
  return {
    vendedor: m(/Vendedor:\s*([^-\n;]+)/i),
    placa: m(/PLACA:?\s*([A-Z0-9-]+)/i),
    sinistro: m(/SINISTRO:?\s*([\d-]+)/i),
    pedido: m(/(?:Pedido|PEDIDO)\s*=?\s*N?o?\s*(\w+)/i),
    condPagto: m(/COND\.?\s*PAGTO[:\s]+([^;\n]+)/i),
    rawTrimmed: cpl.length > 800 ? cpl.slice(0, 800) + '…' : cpl,
  };
}
