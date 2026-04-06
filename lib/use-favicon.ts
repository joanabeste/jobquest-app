import { useEffect } from 'react';

/**
 * Dynamically sets the browser tab favicon.
 * Pass a base64 data URL or a plain URL.
 * If faviconUrl is falsy, does nothing (keeps the default).
 */
export function useFavicon(faviconUrl: string | undefined) {
  useEffect(() => {
    if (!faviconUrl) return;

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const prev = link.href;
    link.href = faviconUrl;

    return () => {
      if (link) link.href = prev;
    };
  }, [faviconUrl]);
}
