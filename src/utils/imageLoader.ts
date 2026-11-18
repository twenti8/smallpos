import { normalizeDriveImageUrl } from './posLogic';

const dataUrlCache = new Map<string, string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to Data URL'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

function loadViaCorsCanvas(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 256;
        canvas.height = img.naturalHeight || img.height || 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Image load error'));
    img.src = url;
  });
}

/**
 * Converts a local, external, or Google Drive image URL into a Base64 Data URL
 * so html2canvas and window.print() render the receipt top logo reliably without tainting.
 */
export async function toBase64DataUrl(rawUrl: string): Promise<string> {
  const normalized = normalizeDriveImageUrl(rawUrl);
  if (!normalized) return '';
  if (normalized.startsWith('data:')) return normalized;

  const cached = dataUrlCache.get(normalized);
  if (cached) return cached;

  try {
    const response = await fetch(normalized, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      dataUrlCache.set(normalized, dataUrl);
      return dataUrl;
    }
  } catch {
    // Fall back to crossOrigin Image + canvas draw below.
  }

  try {
    const canvasDataUrl = await loadViaCorsCanvas(normalized);
    dataUrlCache.set(normalized, canvasDataUrl);
    return canvasDataUrl;
  } catch {
    return normalized;
  }
}

/**
 * Waits for every <img> inside a receipt container to finish loading/decoding
 * before running html2canvas or window.print().
 */
export async function waitForImagesReady(containerEl: HTMLElement | null): Promise<void> {
  if (!containerEl) return;
  const images = Array.from(containerEl.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            if (typeof img.decode === 'function') {
              img.decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
            return;
          }

          const timer = window.setTimeout(() => {
            cleanup();
            resolve();
          }, 4000);

          const onDone = () => {
            cleanup();
            resolve();
          };

          const cleanup = () => {
            window.clearTimeout(timer);
            img.removeEventListener('load', onDone);
            img.removeEventListener('error', onDone);
          };

          img.addEventListener('load', onDone, { once: true });
          img.addEventListener('error', onDone, { once: true });
        })
    )
  );
}
