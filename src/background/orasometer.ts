import {
  clampTargetSec,
  createInitialState,
  getRemainingSeconds,
  isMainEffectivelyRunning,
  migrateOrasometerState,
} from '@/lib/orasometer-state'
import { clampBreakDurationSec, FOCUS_INTERVAL_SEC } from '@/lib/pomodoro'
import type { BgRequest } from '@/types/messages'
import type { OrasometerState } from '@/types/orasometer'
import { STORAGE_KEY, TICK_ALARM } from '@/types/orasometer'

/** Legacy blink alarm (sub-minute alarms are unreliable in MV3); cleared on sync. */
const LEGACY_ICON_BLINK_ALARM = 'orasometer-toolbar-icon-blink'

/** Seconds per bright/dim phase; driven by the 1s tick alarm, not a separate alarm. */
const ICON_BLINK_HALF_PERIOD_SEC = 2

/** Paths relative to extension root — required for `chrome.action.setIcon` (manifest lists normals). */
const TOOLBAR_ICON_NORMAL: Record<string, string> = {
  '16': 'assets/img/extension-icons/icon-16.png',
  '32': 'assets/img/extension-icons/icon-32.png',
  '48': 'assets/img/extension-icons/icon-48.png',
  '128': 'assets/img/extension-icons/icon-128.png',
}

const TOOLBAR_ICON_DIM: Record<string, string> = {
  '16': 'assets/img/extension-icons/icon-16-dim.png',
  '32': 'assets/img/extension-icons/icon-32-dim.png',
  '48': 'assets/img/extension-icons/icon-48-dim.png',
  '128': 'assets/img/extension-icons/icon-128-dim.png',
}

let toolbarIconBlinkBright = true
let iconBlinkSessionActive = false
let toolbarBlinkTickCount = 0

function shouldToolbarIconBlink(s: OrasometerState): boolean {
  if (s.pomodoro.breakCountdownEndAt != null) return true
  return (
    s.pomodoro.breakOfferPending &&
    s.main.phase === 'running' &&
    s.main.runEndAt != null
  )
}

export async function syncToolbarIconBlink(s: OrasometerState): Promise<void> {
  const should = shouldToolbarIconBlink(s)
  if (!should) {
    void chrome.alarms.clear(LEGACY_ICON_BLINK_ALARM)
    iconBlinkSessionActive = false
    toolbarBlinkTickCount = 0
    toolbarIconBlinkBright = true
    try {
      await chrome.action.setIcon({ path: TOOLBAR_ICON_NORMAL })
    } catch {
      /* ignore */
    }
    return
  }
  if (!iconBlinkSessionActive) {
    iconBlinkSessionActive = true
    toolbarBlinkTickCount = 0
    toolbarIconBlinkBright = true
    try {
      await chrome.action.setIcon({ path: TOOLBAR_ICON_NORMAL })
    } catch {
      /* ignore */
    }
  }
}

async function stepToolbarIconBlinkOnTick(s: OrasometerState): Promise<void> {
  if (!shouldToolbarIconBlink(s) || !iconBlinkSessionActive) return
  toolbarBlinkTickCount += 1
  if (toolbarBlinkTickCount < ICON_BLINK_HALF_PERIOD_SEC) return
  toolbarBlinkTickCount = 0
  toolbarIconBlinkBright = !toolbarIconBlinkBright
  try {
    await chrome.action.setIcon({
      path: toolbarIconBlinkBright ? TOOLBAR_ICON_NORMAL : TOOLBAR_ICON_DIM,
    })
  } catch {
    /* ignore */
  }
}

async function syncAndStepToolbarIconBlink(s: OrasometerState): Promise<void> {
  await syncToolbarIconBlink(s)
  await stepToolbarIconBlinkOnTick(s)
}

async function loadState(): Promise<OrasometerState> {
  const raw = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]
  const migrated = migrateOrasometerState(raw)
  if (migrated) return migrated
  const initial = createInitialState()
  await saveState(initial)
  return initial
}

async function saveState(s: OrasometerState): Promise<void> {
  s.updatedAt = Date.now()
  await chrome.storage.local.set({ [STORAGE_KEY]: s })
}

function newId(): string {
  return crypto.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function endBreakAndResumeMain(s: OrasometerState): void {
  s.pomodoro.breakCountdownEndAt = null
  s.pomodoro.breakOfferPending = false
  s.pomodoro.focusElapsedSec = 0
  if (!s.pomodoro.mainPausedForBreak) return
  s.pomodoro.mainPausedForBreak = false
  if (s.main.phase === 'paused' && s.main.remainingSec > 0) {
    s.main.phase = 'running'
    s.main.runEndAt = Date.now() + s.main.remainingSec * 1000
    if (s.tasks.activeTaskId) s.tasks.lastAccrualAtMs = Date.now()
  }
}

function dismissOffer(s: OrasometerState): void {
  s.pomodoro.breakOfferPending = false
  s.pomodoro.focusElapsedSec = 0
}

export async function handleOrasometerRequest(msg: BgRequest): Promise<OrasometerState> {
  const s = await loadState()

  if (msg.type === 'GET_STATE') return s

  if (msg.type === 'RESET') {
    const next = createInitialState()
    await saveState(next)
    await clearSecondAlarm()
    await syncToolbarIconBlink(next)
    return next
  }

  switch (msg.type) {
    case 'BREAK_START_COUNTDOWN': {
      if (s.pomodoro.breakCountdownEndAt != null) break
      s.pomodoro.mainPausedForBreak = false
      if (s.main.phase === 'running') {
        s.main.remainingSec = getRemainingSeconds(s.main)
        s.main.runEndAt = null
        s.main.phase = 'paused'
        s.tasks.lastAccrualAtMs = null
        s.pomodoro.mainPausedForBreak = true
      }
      s.pomodoro.breakCountdownEndAt = Date.now() + s.pomodoro.breakDurationSec * 1000
      s.pomodoro.breakOfferPending = false
      await clearSecondAlarm()
      scheduleSecondAlarm()
      break
    }
    case 'BREAK_SKIP': {
      if (s.pomodoro.breakCountdownEndAt == null) break
      endBreakAndResumeMain(s)
      if (s.main.phase === 'running' && s.main.runEndAt != null) scheduleSecondAlarm()
      break
    }
    case 'BREAK_DISMISS_OFFER': {
      if (s.pomodoro.breakCountdownEndAt != null) break
      if (!s.pomodoro.breakOfferPending) break
      dismissOffer(s)
      break
    }
    case 'SET_PREFERENCES': {
      s.pomodoro.breakDurationSec = clampBreakDurationSec(msg.breakDurationSec)
      if (s.main.phase !== 'running') {
        const t = clampTargetSec(msg.mainTargetDurationSec)
        s.main.targetDurationSec = t
        s.main.remainingSec = t
      }
      break
    }
    case 'START': {
      if (s.pomodoro.breakCountdownEndAt != null) break
      if (s.main.phase === 'running') break
      const rem = getRemainingSeconds(s.main)
      if (rem <= 0) break
      if (s.tasks.items.length === 0) {
        const id = newId()
        s.tasks.items.push({ id, title: 'Task 1', accumulatedSec: 0 })
        s.tasks.activeTaskId = id
      } else if (
        s.tasks.activeTaskId == null ||
        !s.tasks.items.some((t) => t.id === s.tasks.activeTaskId)
      ) {
        s.tasks.activeTaskId = s.tasks.items[0].id
      }
      s.main.runEndAt = Date.now() + rem * 1000
      s.main.phase = 'running'
      if (s.tasks.activeTaskId) {
        s.tasks.lastAccrualAtMs = Date.now()
      }
      scheduleSecondAlarm()
      break
    }
    case 'PAUSE': {
      if (s.main.phase !== 'running') break
      s.main.remainingSec = getRemainingSeconds(s.main)
      s.main.runEndAt = null
      s.main.phase = 'paused'
      s.tasks.lastAccrualAtMs = null
      await clearSecondAlarm()
      break
    }
    case 'ADJUST': {
      if (s.main.phase === 'running') break
      const next = clampTargetSec(s.main.targetDurationSec + msg.deltaSec)
      s.main.targetDurationSec = next
      s.main.remainingSec = next
      if (s.pomodoro.breakCountdownEndAt == null) {
        const p = s.pomodoro
        const fe = p.focusElapsedSec - msg.deltaSec
        p.focusElapsedSec = Math.max(0, Math.min(FOCUS_INTERVAL_SEC, fe))
        if (p.focusElapsedSec >= FOCUS_INTERVAL_SEC) {
          p.breakOfferPending = true
          p.focusElapsedSec = FOCUS_INTERVAL_SEC
        } else {
          p.breakOfferPending = false
        }
      }
      break
    }
    case 'TASK_ADD': {
      const id = newId()
      s.tasks.items.push({
        id,
        title: `Task ${s.tasks.items.length + 1}`,
        accumulatedSec: 0,
      })
      break
    }
    case 'TASK_REMOVE': {
      s.tasks.items = s.tasks.items.filter((t) => t.id !== msg.id)
      if (s.tasks.activeTaskId === msg.id) {
        s.tasks.activeTaskId = null
        s.tasks.lastAccrualAtMs = null
      }
      break
    }
    case 'TASK_SET_TITLE': {
      const t = s.tasks.items.find((x) => x.id === msg.id)
      if (t) t.title = msg.title
      break
    }
    case 'TASK_SET_ACTIVE': {
      s.tasks.activeTaskId = msg.id
      if (isMainEffectivelyRunning(s)) {
        s.tasks.lastAccrualAtMs = Date.now()
      } else {
        s.tasks.lastAccrualAtMs = null
      }
      break
    }
    default:
      break
  }

  await saveState(s)
  await syncToolbarIconBlink(s)
  return s
}

export async function applySecondTick(): Promise<void> {
  const s = await loadState()

  if (s.pomodoro.breakCountdownEndAt != null) {
    if (Date.now() >= s.pomodoro.breakCountdownEndAt) {
      endBreakAndResumeMain(s)
      await saveState(s)
      await syncAndStepToolbarIconBlink(s)
      if (s.main.phase === 'running' && s.main.runEndAt != null) {
        scheduleSecondAlarm()
      } else {
        await clearSecondAlarm()
      }
      return
    }
    await saveState(s)
    scheduleSecondAlarm()
    await syncAndStepToolbarIconBlink(s)
    return
  }

  if (s.main.phase === 'running' && s.main.runEndAt != null) {
    const rem = getRemainingSeconds(s.main)
    if (rem <= 0) {
      s.main.remainingSec = 0
      s.main.runEndAt = null
      s.main.phase = 'idle'
      s.tasks.lastAccrualAtMs = null
      await saveState(s)
      await clearSecondAlarm()
      await syncAndStepToolbarIconBlink(s)
      return
    }

    const p = s.pomodoro
    if (!p.breakOfferPending && p.focusElapsedSec < FOCUS_INTERVAL_SEC) {
      p.focusElapsedSec += 1
    }
    if (!p.breakOfferPending && p.focusElapsedSec >= FOCUS_INTERVAL_SEC) {
      p.breakOfferPending = true
      p.focusElapsedSec = FOCUS_INTERVAL_SEC
      await saveState(s)
    }

    if (isMainEffectivelyRunning(s)) {
      const activeId = s.tasks.activeTaskId
      if (activeId) {
        const task = s.tasks.items.find((t) => t.id === activeId)
        if (task) task.accumulatedSec += 1
      }
    }
  }

  await saveState(s)
  if (s.main.phase === 'running' && s.main.runEndAt != null) {
    scheduleSecondAlarm()
  } else if (s.pomodoro.breakCountdownEndAt != null) {
    scheduleSecondAlarm()
  } else {
    await clearSecondAlarm()
  }
  await syncAndStepToolbarIconBlink(s)
}

export function scheduleSecondAlarm(): void {
  void chrome.alarms.create(TICK_ALARM, { delayInMinutes: 1 / 60 })
}

async function clearSecondAlarm(): Promise<void> {
  await chrome.alarms.clear(TICK_ALARM)
}

export async function ensureTickAlarmIfRunning(): Promise<void> {
  const s = await loadState()
  if (s.pomodoro.breakCountdownEndAt != null) {
    scheduleSecondAlarm()
  } else if (s.main.phase === 'running' && s.main.runEndAt != null) {
    scheduleSecondAlarm()
  } else {
    await clearSecondAlarm()
  }
  await syncToolbarIconBlink(s)
}
