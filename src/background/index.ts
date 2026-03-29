import {
  applySecondTick,
  ensureTickAlarmIfRunning,
  handleBreakWindowRemoved,
  handleOrasometerRequest,
} from './orasometer'
import type { BgRequest } from '@/types/messages'
import { TICK_ALARM } from '@/types/orasometer'

chrome.runtime.onInstalled.addListener(() => {
  void ensureTickAlarmIfRunning()
})

chrome.runtime.onMessage.addListener(
  (msg: BgRequest, _sender, sendResponse: (r: unknown) => void) => {
    void handleOrasometerRequest(msg)
      .then((state) => sendResponse({ ok: true, state }))
      .catch((e: unknown) =>
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }),
      )
    return true
  },
)

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK_ALARM) {
    void applySecondTick()
  }
})

chrome.windows.onRemoved.addListener((windowId) => {
  void handleBreakWindowRemoved(windowId)
})

void ensureTickAlarmIfRunning()
