import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Canonical session blob; extend as you implement timers. */
export type SessionState = {
  version: 1
  updatedAt: number
}

export const useSessionStore = defineStore('session', () => {
  const hydrated = ref(false)
  const session = ref<SessionState | null>(null)

  async function hydrateFromStorage() {
    const { session: raw } = await chrome.storage.local.get('session')
    if (raw && typeof raw === 'object' && 'version' in raw) {
      session.value = raw as SessionState
    }
    hydrated.value = true
  }

  async function persistSession(next: SessionState) {
    session.value = next
    await chrome.storage.local.set({ session: next })
  }

  return { hydrated, session, hydrateFromStorage, persistSession }
})
