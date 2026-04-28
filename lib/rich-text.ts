/**
 * rich-text — Helpers für das Inspector-Seitenpanel.
 *
 * Im Funnel-Editor formatiert der TipTap-basierte `RichEd` Texte inline und
 * speichert HTML in den Block-Props. Das Inspector-Panel soll dem User aber
 * nur den reinen Text zum Editieren zeigen — Formatierung bleibt Aufgabe
 * der Inline-Toolbar auf der Canvas.
 *
 * - `htmlToPlainText` erzeugt den anzuzeigenden Plaintext.
 * - `setPlainText` schreibt den vom User editierten Plaintext zurück ins HTML
 *   und behält dabei die vorhandenen Formatierungs-Wrapper bei.
 */

function getDOMParser(): typeof DOMParser | null {
  return typeof DOMParser !== 'undefined' ? DOMParser : null;
}

export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (!html.includes('<')) return html;

  const withBreaks = html
    .replace(/<\/p>\s*<p\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>(?!\n)/gi, '\n');

  const Parser = getDOMParser();
  if (!Parser) {
    return withBreaks
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  const doc = new Parser().parseFromString(withBreaks, 'text/html');
  return doc.body.textContent ?? '';
}

export function setPlainText(originalHtml: string, newText: string, oldText?: string): string {
  if (!originalHtml || !originalHtml.includes('<')) return newText;

  const Parser = getDOMParser();
  if (!Parser) return newText;

  const doc = new Parser().parseFromString(originalHtml, 'text/html');
  const root = doc.body;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  if (textNodes.length === 0) {
    let deepest: Element = root;
    while (deepest.firstElementChild) deepest = deepest.firstElementChild;
    deepest.textContent = newText;
    return root.innerHTML;
  }

  const rawText = textNodes.map((t) => t.data).join('');
  const fromText = oldText ?? rawText;

  // Multi-paragraph oder <br>: das angezeigte oldText enthält \n, das im rohen
  // Textknoten-Konkat nicht vorkommt — kein verlässlicher 1:1-Diff möglich.
  // Fallback: alles zu Plaintext kollabieren (verliert Inline-Formatierung).
  if (fromText !== rawText) {
    root.textContent = newText;
    return root.innerHTML;
  }

  const prefixLen = commonPrefixLen(fromText, newText);
  const suffixLen = commonSuffixLen(fromText, newText, prefixLen);
  const removeStart = prefixLen;
  const removeEnd = fromText.length - suffixLen;
  const inserted = newText.slice(prefixLen, newText.length - suffixLen);

  let pos = 0;
  let insertedAt = false;
  for (const tn of textNodes) {
    const nodeStart = pos;
    const nodeEnd = pos + tn.data.length;
    const overlapStart = Math.max(removeStart, nodeStart);
    const overlapEnd = Math.min(removeEnd, nodeEnd);

    if (overlapStart < overlapEnd) {
      const localStart = overlapStart - nodeStart;
      const localEnd = overlapEnd - nodeStart;
      const before = tn.data.slice(0, localStart);
      const after = tn.data.slice(localEnd);
      if (!insertedAt) {
        tn.data = before + inserted + after;
        insertedAt = true;
      } else {
        tn.data = before + after;
      }
    } else if (
      !insertedAt &&
      removeStart === removeEnd &&
      removeStart >= nodeStart &&
      removeStart <= nodeEnd
    ) {
      const localStart = removeStart - nodeStart;
      tn.data = tn.data.slice(0, localStart) + inserted + tn.data.slice(localStart);
      insertedAt = true;
    }

    pos = nodeEnd;
  }

  if (!insertedAt && inserted) {
    const last = textNodes[textNodes.length - 1];
    last.data = last.data + inserted;
  }

  return root.innerHTML;
}

function commonPrefixLen(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) return i;
  return len;
}

function commonSuffixLen(a: string, b: string, prefixLen: number): number {
  const max = Math.min(a.length - prefixLen, b.length - prefixLen);
  for (let i = 0; i < max; i++) {
    if (a[a.length - 1 - i] !== b[b.length - 1 - i]) return i;
  }
  return max;
}
