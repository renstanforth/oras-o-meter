import { createInitialState, migrateOrasometerState } from '@/lib/orasometer-state'
import type { BgRequest, BgResponse } from '@/types/messages'
import type { OrasometerState } from '@/types/orasometer'
import { STORAGE_KEY } from '@/types/orasometer'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function isConnectionError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err)
  return (
    m.includes('Receiving end does not exist') ||
    m.includes('Could not establish connection') ||
    m.includes('message port closed') ||
    m.includes('No response from background')
  )
}

/**
 * MV3 service workers are not always running when the popup opens.
 * Retries fix "Could not establish connection. Receiving end does not exist."
 */
export async function sendBgWithRetry(
  msg: BgRequest,
  options?: { maxRetries?: number },
): Promise<OrasometerState> {
  const maxRetries = options?.maxRetries ?? 8
  let lastErr: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = (await chrome.runtime.sendMessage(msg)) as BgResponse | undefined
      if (!res || typeof res !== 'object' || !('ok' in res)) {
        throw new Error('No response from background')
      }
      if (!res.ok) {
        throw new Error(res.error ?? 'Background error')
      }
      return res.state
    } catch (e) {
      lastErr = e
      if (attempt < maxRetries && isConnectionError(e)) {
        await sleep(40 + attempt * 35)
        continue
      }
      throw e
    }
  }
  throw lastErr
}

/** Read persisted state without messaging (works even if the service worker is asleep). */
export async function loadStateFromStorage(): Promise<OrasometerState | null> {
  const raw = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]
  return migrateOrasometerState(raw)
}

/**
 * Hydrate UI from storage only. Do not await messaging: MV3 service workers are often
 * asleep when the popup opens; calling sendMessage first spams "Receiving end does not
 * exist" and surfaces as Vue runtime errors.
 */
export async function hydrateOrasometerState(): Promise<OrasometerState> {
  let s = await loadStateFromStorage()
  if (!s) {
    s = createInitialState()
    await chrome.storage.local.set({ [STORAGE_KEY]: s })
  }
  // Wake the service worker so alarms / tick logic can run; never reject into the UI.
  void chrome.runtime
    .sendMessage({ type: 'GET_STATE' } satisfies BgRequest)
    .catch(() => {})
  return s
}
