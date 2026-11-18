// Partage 100 % hors-ligne et sans serveur d'une séance ou d'une recette via hash URL compact (#share=...)

export function encodeShareUrl(type, payloadObj) {
  try {
    const json = JSON.stringify({ v: 1, t: type, d: payloadObj });
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const base =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : './';
    return `${base}#share=${b64}`;
  } catch {
    return '';
  }
}

export function decodeShareHash(hashStr = '') {
  try {
    const raw = String(hashStr || '');
    const match = raw.match(/#share=([A-Za-z0-9\-_]+)/);
    if (!match) return null;
    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || !parsed.t || !parsed.d) return null;
    return { type: parsed.t, data: parsed.d };
  } catch {
    return null;
  }
}

export async function triggerNativeOrClipboardShare(title, shareUrl) {
  if (!shareUrl) return false;
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url: shareUrl });
      return 'shared';
    } catch {
      // Annulé par l'utilisateur ou repli presse-papier
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return 'copied';
    } catch {
      // Repli
    }
  }
  return false;
}
