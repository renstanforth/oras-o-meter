export type MainPhase = 'idle' | 'running' | 'paused'

export type TaskItem = {
  id: string
  title: string
  accumulatedSec: number
}

/** Canonical persisted state (v3). */
export type OrasometerState = {
  version: 3
  updatedAt: number
  main: {
    targetDurationSec: number
    phase: MainPhase
    /** Epoch ms when `phase === 'running'`; remaining derived until this instant. */
    runEndAt: number | null
    /** Used when `phase` is `idle` or `paused`. */
    remainingSec: number
  }
  pomodoro: {
    focusElapsedSec: number
    /** When set, break countdown is active; main work timer is paused per README. */
    breakCountdownEndAt: number | null
    /** True after 25 min focus until user dismisses or starts a break countdown. */
    breakOfferPending: boolean
    /** Break length when user presses Play (seconds). */
    breakDurationSec: number
    /** If true, resume main to running when the break countdown ends or is skipped. */
    mainPausedForBreak: boolean
  }
  tasks: {
    items: TaskItem[]
    activeTaskId: string | null
    /** Last wall time we credited task accrual (running main + active task). */
    lastAccrualAtMs: number | null
  }
}

export const STORAGE_KEY = 'orasometer' as const

export const TICK_ALARM = 'orasometer-second-tick' as const
