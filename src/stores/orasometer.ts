import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { formatHms, getRemainingSeconds } from '@/lib/orasometer-state'
import { hydrateOrasometerState, sendBgWithRetry } from '@/lib/send-bg'
import type { BgRequest } from '@/types/messages'
import type { OrasometerState } from '@/types/orasometer'
import { STORAGE_KEY } from '@/types/orasometer'

async function sendBg(msg: BgRequest): Promise<OrasometerState> {
  return sendBgWithRetry(msg)
}

export const useOrasometerStore = defineStore('orasometer', () => {
  const state = ref<OrasometerState | null>(null)
  const hydrated = ref(false)
  const view = ref<'main' | 'tasks' | 'settings'>('main')
  const now = ref(Date.now())
  let clock: ReturnType<typeof setInterval> | undefined

  const displayRemainingSec = computed(() => {
    const s = state.value
    if (!s) return 0
    const m = s.main
    if (m.phase === 'running' && m.runEndAt != null) {
      return Math.max(0, Math.ceil((m.runEndAt - now.value) / 1000))
    }
    return getRemainingSeconds(m)
  })

  const displayRemainingLabel = computed(() => formatHms(displayRemainingSec.value))

  const progress = computed(() => {
    const s = state.value
    if (!s) return 0
    const t = Math.max(1, s.main.targetDurationSec)
    return Math.min(1, displayRemainingSec.value / t)
  })

  const totalTaskSec = computed(() => {
    const s = state.value
    if (!s) return 0
    return s.tasks.items.reduce((a, t) => a + t.accumulatedSec, 0)
  })

  async function refresh() {
    state.value = await hydrateOrasometerState()
    hydrated.value = true
  }

  function startClock() {
    if (clock != null) return
    clock = setInterval(() => {
      now.value = Date.now()
    }, 200)
  }

  function stopClock() {
    if (clock != null) {
      clearInterval(clock)
      clock = undefined
    }
  }

  watch(
    () => state.value?.main.phase,
    (phase) => {
      if (phase === 'running') {
        // While idle/paused we stop the interval, so `now` goes stale; sync before using
        // runEndAt − now or the label briefly shows ~1–2 extra seconds then jumps down.
        now.value = Date.now()
        startClock()
      } else {
        stopClock()
      }
    },
    { immediate: true },
  )

  /** Call from `App.vue` `onMounted`; run returned cleanup on `onUnmounted`. */
  function startStorageSync() {
    const fn = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local' || !changes[STORAGE_KEY]?.newValue) return
      state.value = changes[STORAGE_KEY].newValue as OrasometerState
    }
    chrome.storage.onChanged.addListener(fn)
    return () => chrome.storage.onChanged.removeListener(fn)
  }

  async function start() {
    state.value = await sendBg({ type: 'START' })
  }

  async function pause() {
    state.value = await sendBg({ type: 'PAUSE' })
  }

  async function reset() {
    state.value = await sendBg({ type: 'RESET' })
    view.value = 'main'
  }

  async function adjust(deltaSec: number) {
    state.value = await sendBg({ type: 'ADJUST', deltaSec })
  }

  async function taskAdd() {
    state.value = await sendBg({ type: 'TASK_ADD' })
  }

  async function taskRemove(id: string) {
    state.value = await sendBg({ type: 'TASK_REMOVE', id })
  }

  async function taskSetTitle(id: string, title: string) {
    state.value = await sendBg({ type: 'TASK_SET_TITLE', id, title })
  }

  async function taskSetActive(id: string | null) {
    state.value = await sendBg({ type: 'TASK_SET_ACTIVE', id })
  }

  async function takeBreak() {
    state.value = await sendBg({ type: 'TAKE_BREAK' })
  }

  async function breakStartCountdown() {
    state.value = await sendBg({ type: 'BREAK_START_COUNTDOWN' })
  }

  async function breakSkip() {
    state.value = await sendBg({ type: 'BREAK_SKIP' })
  }

  async function breakDismissOffer() {
    state.value = await sendBg({ type: 'BREAK_DISMISS_OFFER' })
  }

  async function savePreferences(mainTargetDurationSec: number, breakDurationSec: number) {
    state.value = await sendBg({
      type: 'SET_PREFERENCES',
      mainTargetDurationSec,
      breakDurationSec,
    })
  }

  return {
    state,
    hydrated,
    view,
    displayRemainingSec,
    displayRemainingLabel,
    progress,
    totalTaskSec,
    refresh,
    startStorageSync,
    start,
    pause,
    reset,
    adjust,
    taskAdd,
    taskRemove,
    taskSetTitle,
    taskSetActive,
    takeBreak,
    breakStartCountdown,
    breakSkip,
    breakDismissOffer,
    savePreferences,
  }
})
