import type { OrasometerState } from '@/types/orasometer'
import { DEFAULT_BREAK_DURATION_SEC } from '@/lib/pomodoro'

/** Default set to 8 hours (8 * 3600 = 28800 seconds); change anytime. */
export const DEFAULT_TARGET_DURATION_SEC = 8 * 3600

export function createInitialState(): OrasometerState {
  const t = DEFAULT_TARGET_DURATION_SEC
  const now = Date.now()
  return {
    version: 3,
    updatedAt: now,
    main: {
      targetDurationSec: t,
      phase: 'idle',
      runEndAt: null,
      remainingSec: t,
    },
    pomodoro: {
      focusElapsedSec: 0,
      breakCountdownEndAt: null,
      breakOfferPending: false,
      breakDurationSec: DEFAULT_BREAK_DURATION_SEC,
      mainPausedForBreak: false,
    },
    tasks: {
      items: [],
      activeTaskId: null,
      lastAccrualAtMs: null,
    },
  }
}

export function getRemainingSeconds(main: OrasometerState['main']): number {
  if (main.phase === 'running' && main.runEndAt != null) {
    return Math.max(0, Math.ceil((main.runEndAt - Date.now()) / 1000))
  }
  return main.remainingSec
}

export function isMainEffectivelyRunning(s: OrasometerState): boolean {
  return s.main.phase === 'running' && s.pomodoro.breakCountdownEndAt == null
}

export function formatHms(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function clampTargetSec(sec: number): number {
  return Math.max(15, Math.min(24 * 3600, sec))
}

/** Migrate persisted blobs (v2 → v3) or return null if invalid. */
export function migrateOrasometerState(raw: unknown): OrasometerState | null {
  if (!raw || typeof raw !== 'object') return null
  const v = (raw as { version?: number }).version
  if (v === 3) {
    const o = raw as Record<string, unknown>
    const pom = (o.pomodoro as Record<string, unknown>) || {}
    return {
      ...o,
      version: 3,
      pomodoro: {
        focusElapsedSec: typeof pom.focusElapsedSec === 'number' ? pom.focusElapsedSec : 0,
        breakCountdownEndAt:
          typeof pom.breakCountdownEndAt === 'number' || pom.breakCountdownEndAt === null
            ? (pom.breakCountdownEndAt as number | null)
            : null,
        breakOfferPending: Boolean(pom.breakOfferPending),
        breakDurationSec:
          typeof pom.breakDurationSec === 'number' ? pom.breakDurationSec : DEFAULT_BREAK_DURATION_SEC,
        mainPausedForBreak: Boolean(pom.mainPausedForBreak),
      },
    } as OrasometerState
  }
  if (v === 2) {
    const o = raw as Record<string, unknown>
    const pom = o.pomodoro as { focusElapsedSec: number; breakCountdownEndAt: number | null }
    return {
      ...o,
      version: 3,
      pomodoro: {
        focusElapsedSec: pom.focusElapsedSec,
        breakCountdownEndAt: pom.breakCountdownEndAt,
        breakOfferPending: false,
        breakDurationSec: DEFAULT_BREAK_DURATION_SEC,
        mainPausedForBreak: false,
      },
    } as OrasometerState
  }
  return null
}

