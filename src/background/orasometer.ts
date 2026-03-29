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

const BREAK_PAGE = 'src/break/index.html'

/** Ignore user-close handling when we remove the break window programmatically. */
let ignoreNextBreakWindowRemoval = false

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

async function openBreakWindow(s: OrasometerState): Promise<void> {
  const url = chrome.runtime.getURL(BREAK_PAGE)
  if (s.pomodoro.breakWindowId != null) {
    try {
      await chrome.windows.get(s.pomodoro.breakWindowId)
      await chrome.windows.update(s.pomodoro.breakWindowId, { focused: true })
      return
    } catch {
      s.pomodoro.breakWindowId = null
    }
  }
  const w = await chrome.windows.create({
    url,
    type: 'popup',
    width: 400,
    height: 460,
    focused: true,
  })
  s.pomodoro.breakWindowId = w.id ?? null
}

async function closeBreakWindowIfOpen(s: OrasometerState): Promise<void> {
  const id = s.pomodoro.breakWindowId
  if (id == null) return
  s.pomodoro.breakWindowId = null
  await saveState(s)
  ignoreNextBreakWindowRemoval = true
  try {
    await chrome.windows.remove(id)
  } catch {
    ignoreNextBreakWindowRemoval = false
  }
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

export async function handleBreakWindowRemoved(windowId: number): Promise<void> {
  if (ignoreNextBreakWindowRemoval) {
    ignoreNextBreakWindowRemoval = false
    return
  }
  const s = await loadState()
  if (s.pomodoro.breakWindowId !== windowId) return
  s.pomodoro.breakWindowId = null
  if (s.pomodoro.breakCountdownEndAt != null) {
    endBreakAndResumeMain(s)
  } else if (s.pomodoro.breakOfferPending) {
    dismissOffer(s)
  }
  await saveState(s)
}

export async function handleOrasometerRequest(msg: BgRequest): Promise<OrasometerState> {
  const s = await loadState()

  if (msg.type === 'GET_STATE') return s

  if (msg.type === 'RESET') {
    await closeBreakWindowIfOpen(s)
    const next = createInitialState()
    await saveState(next)
    await clearSecondAlarm()
    return next
  }

  switch (msg.type) {
    case 'TAKE_BREAK': {
      await openBreakWindow(s)
      break
    }
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
      await closeBreakWindowIfOpen(s)
      if (s.main.phase === 'running' && s.main.runEndAt != null) scheduleSecondAlarm()
      break
    }
    case 'BREAK_DISMISS_OFFER': {
      if (s.pomodoro.breakCountdownEndAt != null) break
      if (!s.pomodoro.breakOfferPending) break
      dismissOffer(s)
      await closeBreakWindowIfOpen(s)
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
  return s
}

export async function applySecondTick(): Promise<void> {
  const s = await loadState()

  if (s.pomodoro.breakCountdownEndAt != null) {
    if (Date.now() >= s.pomodoro.breakCountdownEndAt) {
      endBreakAndResumeMain(s)
      await saveState(s)
      await closeBreakWindowIfOpen(s)
      if (s.main.phase === 'running' && s.main.runEndAt != null) {
        scheduleSecondAlarm()
      } else {
        await clearSecondAlarm()
      }
      return
    }
    await saveState(s)
    scheduleSecondAlarm()
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
      await openBreakWindow(s)
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
}

export function scheduleSecondAlarm(): void {
  void chrome.alarms.create(TICK_ALARM, { delayInMinutes: 1 / 60 })
}

async function clearSecondAlarm(): Promise<void> {
  await chrome.alarms.clear(TICK_ALARM)
}

export async function ensureTickAlarmIfRunning(): Promise<void> {
  const s = await loadState()
  if (s.main.phase === 'running' && s.main.runEndAt != null) {
    scheduleSecondAlarm()
  } else if (s.pomodoro.breakCountdownEndAt != null) {
    scheduleSecondAlarm()
  }
}
