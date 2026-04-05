import type { OrasometerState } from './orasometer'

export type BgRequest =
  | { type: 'GET_STATE' }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'ADJUST'; deltaSec: number }
  | { type: 'TASK_ADD' }
  | { type: 'TASK_REMOVE'; id: string }
  | { type: 'TASK_SET_TITLE'; id: string; title: string }
  | { type: 'TASK_SET_ACTIVE'; id: string | null }
  /** Start the break countdown (Play); pauses main if it was running. */
  | { type: 'BREAK_START_COUNTDOWN' }
  /** End break early: resume main, reset focus interval, close window. */
  | { type: 'BREAK_SKIP' }
  /** Dismiss interval offer before Play: reset focus, main keeps running. */
  | { type: 'BREAK_DISMISS_OFFER' }
  /** Persist main work target and break length (break always; main target only when not running). */
  | { type: 'SET_PREFERENCES'; mainTargetDurationSec: number; breakDurationSec: number }

export type BgResponse =
  | { ok: true; state: OrasometerState }
  | { ok: false; error?: string }
