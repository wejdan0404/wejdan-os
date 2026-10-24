/** Hands a generated file to the person without a server: Web Share (with the file) where supported, else a download. */

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported'

export const makeFile = (content: string, name: string, mime: string): File => new File([content], name, { type: mime })

/** True when this browser can share [file] through the system share sheet (iOS Safari / PWA does). */
export function canShareFile(file: File): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/** Opens the share sheet with the file. `cancelled` when she dismissed it; `unsupported` → use [downloadFile]. */
export async function shareFile(file: File, title: string): Promise<ShareOutcome> {
  if (!canShareFile(file)) return 'unsupported'
  try {
    await navigator.share({ files: [file], title })
    return 'shared'
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'unsupported'
  }
}

/** Blob download link (works in iOS Safari and the standalone PWA). */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
