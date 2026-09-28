/**
 * @file intervaloVisivel.ts
 * @description Polling que só roda com a aba VISÍVEL e atualiza na hora quando o usuário volta pra aba.
 *              Com o painel aberto em segundo plano, o polling seguia buscando a lista inteira de notas
 *              (~2 MB), o health e o XP o dia todo, sem ninguém olhando.
 * @story custo-google-2026-09-28
 * @agent @dev
 * @created 2026-09-28
 */

type Doc = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;

/**
 * Chama `fn` agora e depois a cada `ms`, mas só com a aba visível. Ao voltar pra aba, chama na hora
 * se o último disparo tem `ms` ou mais. Devolve a função que para tudo (usar como cleanup do useEffect).
 */
export function iniciaIntervaloVisivel(
  fn: () => void,
  ms: number,
  doc: Doc = document,
  agora: () => number = Date.now,
): () => void {
  let ultimo = agora();
  fn();
  const dispara = () => {
    ultimo = agora();
    fn();
  };
  const tick = () => {
    if (doc.visibilityState !== 'visible') return;
    if (agora() - ultimo < ms / 2) return; // acabou de rodar pela volta à aba
    dispara();
  };
  const aoMudarVisibilidade = () => {
    if (doc.visibilityState === 'visible' && agora() - ultimo >= ms) dispara();
  };
  const id = setInterval(tick, ms);
  doc.addEventListener('visibilitychange', aoMudarVisibilidade);
  return () => {
    clearInterval(id);
    doc.removeEventListener('visibilitychange', aoMudarVisibilidade);
  };
}
