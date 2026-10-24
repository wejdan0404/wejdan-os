/**
 * `React.lazy` remembers a failed import forever, so a screen whose chunk failed once (flaky
 * network on a first visit) could never come back without a full reload. This wrapper retries
 * the import a couple of times with a short backoff; if it still fails, the error reaches the
 * error boundary, and the boundary's «جرّبي مرة ثانية» (or navigating away) calls
 * `resetFailedImports()`, which swaps in a fresh lazy — so the retry really tries again.
 *
 * Browsers also remember a failed module fetch for the page's lifetime (Chromium re-rejects the
 * same URL without touching the network), so a retry re-imports the chunk URL named in the error
 * with a cache-busting query. Where the error names no URL (Safari), the boundary's
 * «حدّثي التطبيق» is the calm way out.
 */
import { createElement, lazy, type ComponentType } from 'react'

const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk/i

/** True for a failed code-split import (usually the network), not a bug in the screen. */
export const isChunkLoadError = (e: unknown): boolean =>
  e instanceof Error && (e.name === 'ChunkLoadError' || CHUNK_ERROR.test(e.message))

/** The chunk URL a failed import names, with a fresh query so the browser fetches it again. */
export function retryUrlFor(e: unknown, stamp: number = Date.now()): string | null {
  const msg = e instanceof Error ? e.message : String(e)
  const m = /https?:\/\/[^\s'"()]+/.exec(msg)
  if (!m) return null
  const url = m[0].replace(/[.,;:]+$/, '').replace(/[?&]retry=\d+$/, '')
  return `${url}${url.includes('?') ? '&' : '?'}retry=${stamp}`
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Imports that failed and are waiting for a reset. */
const failed = new Set<() => void>()

/** Lets every failed lazy screen try its import again on the next render. */
export function resetFailedImports(): void {
  const resets = [...failed]
  failed.clear()
  for (const r of resets) r()
}

export function lazyWithRetry<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  o: { retries?: number; baseMs?: number } = {},
): ComponentType<P> {
  const retries = o.retries ?? 2
  const baseMs = o.baseMs ?? 400
  const fresh = () => {
    current = lazy(load)
  }
  const load = async (): Promise<{ default: ComponentType<P> }> => {
    let bust: string | null = null
    for (let n = 0; ; n++) {
      try {
        if (bust) return (await import(/* @vite-ignore */ bust)) as { default: ComponentType<P> }
        return await factory()
      } catch (e) {
        bust = isChunkLoadError(e) ? (retryUrlFor(e) ?? bust) : null
        if (n >= retries) {
          failed.add(fresh)
          if (e instanceof Error && !isChunkLoadError(e)) throw e
          const err = e instanceof Error ? e : new Error(String(e))
          err.name = 'ChunkLoadError'
          throw err
        }
        await sleep(baseMs * 2 ** n)
      }
    }
  }
  let current = lazy(load)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Retrying = (props: P) => createElement(current as ComponentType<any>, props)
  return Retrying
}
