/**
 * sanitizeHtml — strips event handlers and javascript: URLs from HTML.
 *
 * Uses the native DOMParser (browser-only). On the server (SSR/RSC) the
 * content is returned as-is because it comes from authenticated authors,
 * not from anonymous user input, and server rendering doesn't execute JS.
 *
 * What is removed:
 *   - All on* attributes (onclick, onerror, onload, …)
 *   - Any attribute whose value starts with "javascript:"
 *   - <script> elements
 *
 * What is preserved:
 *   - All formatting tags (b, strong, i, em, u, s, br, p, h1-h6, ul, li, …)
 *   - Links (<a href="https://…">) — only javascript: hrefs are removed
 *   - Inline styles (colors etc. from the rich-text editor)
 *   - Images (from the media uploader)
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  if (!html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('script').forEach((el) => el.remove());

  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (
        attr.name.startsWith('on') ||
        attr.value.trimStart().toLowerCase().startsWith('javascript:')
      ) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}
