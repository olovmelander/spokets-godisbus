import { PHOTO_MAX_BYTES } from '../save/photos';

/**
 * Call synchronously after WebGL renders, before the browser discards the drawing buffer. Copying into
 * a tiny 2D canvas immediately permits asynchronous WebP encoding without preserveDrawingBuffer or a
 * second scene render. Only the game canvas is read: no DOM, camera, files or remote images.
 */
export function captureFrame(canvas: HTMLCanvasElement): Promise<Blob | null> {
  try {
    if (canvas.width <= 0 || canvas.height <= 0) return Promise.resolve(null);
    const copy = canvas.ownerDocument.createElement('canvas');
    const scale = Math.min(1, 640 / canvas.width, 360 / canvas.height);
    copy.width = Math.max(1, Math.round(canvas.width * scale));
    copy.height = Math.max(1, Math.round(canvas.height * scale));
    const context = copy.getContext('2d');
    if (!context) return Promise.resolve(null);
    context.drawImage(canvas, 0, 0, copy.width, copy.height);
    return new Promise((resolve) => {
      copy.toBlob((blob) => resolve(blob?.type === 'image/webp' && blob.size <= PHOTO_MAX_BYTES ? blob : null), 'image/webp', 0.76);
    });
  } catch { return Promise.resolve(null); }
}
