#!/usr/bin/env node
/**
 * @file tools/archive-sheet.cjs
 * @description Arquivamento automático de APROVACOES_PENDENTES.
 *              Move notas mais velhas que RETAIN_DAYS para a aba de arquivo,
 *              mantendo a planilha viva enxuta (evita estourar o grid do Sheets
 *              e degradar a leitura do backend).
 *
 *              SEGURO: o n8n casa tudo por CHAVE (append + update por
 *              matchingColumns), nunca por número de linha. Deletar linhas
 *              antigas não quebra o pipeline.
 *
 *              Uso:
 *                node tools/archive-sheet.cjs            -> DRY RUN (só relatório)
 *                node tools/archive-sheet.cjs --apply    -> executa
 *
 *              Credencial (nessa ordem):
 *                1. env GOOGLE_SHEETS_SA  (JSON completo da service account)
 *                2. env GOOGLE_APPLICATION_CREDENTIALS (path do arquivo)
 *
 * @story incidente 17/06 (range estourado) + 19/08 (grid perto do teto)
 * @agent @dev
 * @created 2026-08-19
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

// ─── Config ──────────────────────────────────────────────────
const SHEET_ID = process.env.SHEET_ID || '1akTHZ-BpBVv74mSKoxnq1fiAknFBx_BSfIVbb_3ZRQU';
const SRC_TAB = process.env.SRC_TAB || 'APROVACOES_PENDENTES';
const ARCHIVE_TAB = process.env.ARCHIVE_TAB || 'APROVACOES_ARQUIVO';
const RETAIN_DAYS = Number(process.env.RETAIN_DAYS || 60);
const BACKUP_DIR = process.env.BACKUP_DIR || 'backups';
const APPLY = process.argv.includes('--apply');

const IDX_STATUS = 2; // col C
const IDX_TIMESTAMP = 11; // col L

// ─── Guards (abortam ANTES de qualquer escrita) ───────────────
const MAX_ARCHIVE_PCT = 0.75; // nunca arquivar mais que 75% do total
const MIN_KEEP_ROWS = 300; // sempre sobrar pelo menos 300 linhas na viva
const MIN_BACKUP_BYTES = 1000;

function makeAuth(readonly) {
  const scopes = [
    readonly
      ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
      : 'https://www.googleapis.com/auth/spreadsheets',
  ];
  const raw = process.env.GOOGLE_SHEETS_SA;
  if (raw && raw.trim().startsWith('{')) {
    return new GoogleAuth({ credentials: JSON.parse(raw), scopes });
  }
  const kf = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (kf && fs.existsSync(kf)) return new GoogleAuth({ keyFilename: kf, scopes });
  throw new Error('Sem credencial: defina GOOGLE_SHEETS_SA (JSON) ou GOOGLE_APPLICATION_CREDENTIALS (path)');
}

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY (vai escrever)' : 'DRY RUN (so relatorio)'} | retencao: ${RETAIN_DAYS} dias`);

  const auth = makeAuth(!APPLY);
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const H = { Authorization: 'Bearer ' + token };

  const api = async (url, opts = {}) => {
    const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
    const txt = await r.text();
    let j;
    try { j = JSON.parse(txt); } catch { j = txt; }
    if (!r.ok) {
      const body = typeof j === 'string' ? j : JSON.stringify(j);
      throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
    }
    return j;
  };

  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`;
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SRC_TAB + '!A1:AI')}`;

  // 1) metadados: gid + tamanho do grid
  const meta = await api(metaUrl);
  const src = (meta.sheets || []).find((s) => s.properties.title === SRC_TAB);
  if (!src) throw new Error(`aba ${SRC_TAB} nao encontrada`);
  const SRC_GID = src.properties.sheetId;
  const grid = src.properties.gridProperties || {};
  console.log(`Grid de ${SRC_TAB}: ${grid.rowCount} linhas x ${grid.columnCount} colunas`);

  // 2) lê tudo
  const data = await api(valuesUrl);
  const rows = data.values || [];
  if (rows.length < 2) {
    console.log('Aba vazia ou so cabecalho. Nada a fazer.');
    return;
  }
  const header = rows[0];
  const dataRows = rows.slice(1);
  console.log(`Lidas ${dataRows.length} linhas de dado (+1 cabecalho), ${header.length} colunas`);

  // 3) classifica keep vs archive
  const cutoff = Date.now() - RETAIN_DAYS * 24 * 3600 * 1000;
  const keep = [];
  const archive = [];
  const breakdown = {};
  let semData = 0;
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const t = Date.parse(String(r[IDX_TIMESTAMP] || ''));
    if (isNaN(t)) {
      semData++;
      keep.push({ rowNum: i + 2, values: r }); // sem data legivel -> preserva
      continue;
    }
    if (t >= cutoff) {
      keep.push({ rowNum: i + 2, values: r });
    } else {
      archive.push({ rowNum: i + 2, values: r });
      const s = String(r[IDX_STATUS] || '').toUpperCase() || '(vazio)';
      breakdown[s] = (breakdown[s] || 0) + 1;
    }
  }

  const pctArch = dataRows.length ? archive.length / dataRows.length : 0;
  console.log('');
  console.log('=== RELATORIO ===');
  console.log(`MANTEM na viva: ${keep.length}${semData ? ` (inclui ${semData} sem data, preservadas)` : ''}`);
  console.log(`ARQUIVA:        ${archive.length}`);
  console.log(`Status arquivadas: ${JSON.stringify(breakdown)}`);
  console.log(`Viva: ${dataRows.length} -> ${keep.length} linhas (${(pctArch * 100).toFixed(0)}% arquivado)`);
  console.log(`Folga do grid antes: ${(grid.rowCount || 0) - dataRows.length} linhas`);

  if (archive.length === 0) {
    console.log('\nNada fora da janela de retencao. Saindo sem alterar.');
    return;
  }

  // 4) GUARDS
  if (pctArch > MAX_ARCHIVE_PCT) {
    throw new Error(`GUARD: arquivaria ${(pctArch * 100).toFixed(0)}% (limite ${MAX_ARCHIVE_PCT * 100}%). Abortado, verifique as datas.`);
  }
  if (keep.length < MIN_KEEP_ROWS) {
    throw new Error(`GUARD: sobrariam so ${keep.length} linhas (minimo ${MIN_KEEP_ROWS}). Abortado.`);
  }

  if (!APPLY) {
    console.log('\n*** DRY RUN, nada foi alterado. Rode com --apply para executar. ***');
    return;
  }

  // 5) BACKUP obrigatório
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${SRC_TAB}-PRE-ARCHIVE-${ts}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      sheetId: SHEET_ID,
      tab: SRC_TAB,
      retainDays: RETAIN_DAYS,
      header,
      rowCount: dataRows.length,
      rows: dataRows,
    })
  );
  const bytes = fs.statSync(backupPath).size;
  if (bytes < MIN_BACKUP_BYTES) throw new Error('GUARD: backup suspeito (muito pequeno). Abortado antes de escrever.');
  console.log(`\nBACKUP OK: ${backupPath} (${(bytes / 1024).toFixed(0)} KB)`);

  // 6) garante aba de arquivo
  const archTab = (meta.sheets || []).find((s) => s.properties.title === ARCHIVE_TAB);
  if (!archTab) {
    await api(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: ARCHIVE_TAB } } }] }),
    });
    await api(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(ARCHIVE_TAB + '!A1')}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [header] }),
      }
    );
    console.log(`Aba ${ARCHIVE_TAB} criada.`);
  }

  // 7) append no arquivo (lotes de 500)
  const vals = archive.map((a) => a.values);
  for (let i = 0; i < vals.length; i += 500) {
    await api(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(ARCHIVE_TAB + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: vals.slice(i, i + 500) }),
      }
    );
    console.log(`  arquivadas ${Math.min(i + 500, vals.length)}/${vals.length}`);
  }

  // 8) deleta da viva, bottom-up em intervalos contíguos
  const del = archive.map((a) => a.rowNum).sort((x, y) => y - x);
  const ranges = [];
  let runEnd = null;
  let runStart = null;
  const flush = () => {
    if (runStart !== null) ranges.push({ startIndex: runStart - 1, endIndex: runEnd });
  };
  for (const rn of del) {
    if (runEnd === null) {
      runEnd = rn;
      runStart = rn;
      continue;
    }
    if (rn === runStart - 1) runStart = rn;
    else {
      flush();
      runEnd = rn;
      runStart = rn;
    }
  }
  flush();
  console.log(`Deletando ${del.length} linhas em ${ranges.length} intervalo(s)...`);
  for (let i = 0; i < ranges.length; i += 100) {
    await api(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: ranges.slice(i, i + 100).map((r) => ({
          deleteDimension: {
            range: { sheetId: SRC_GID, dimension: 'ROWS', startIndex: r.startIndex, endIndex: r.endIndex },
          },
        })),
      }),
    });
  }

  // 9) verificação pós-execução
  const after = await api(valuesUrl);
  const afterRows = (after.values || []).slice(1);
  const meta2 = await api(metaUrl);
  const src2 = (meta2.sheets || []).find((s) => s.properties.title === SRC_TAB);
  const grid2 = (src2 && src2.properties.gridProperties) || {};
  const pend = afterRows.filter((r) => String(r[IDX_STATUS] || '').toUpperCase() === 'PENDENTE').length;
  console.log('');
  console.log('=== POS-ARQUIVO ===');
  console.log(`Viva: ${afterRows.length} linhas (era ${dataRows.length})`);
  console.log(`Grid: ${grid2.rowCount} linhas | folga: ${(grid2.rowCount || 0) - afterRows.length}`);
  console.log(`Pendentes preservadas: ${pend}`);
  if (afterRows.length > dataRows.length) {
    throw new Error('ALERTA: a aba viva cresceu apos arquivar. Verifique manualmente.');
  }
  console.log('OK.');
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
