const ALARM_TICK = 'orasometer-tick'

chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_TICK) return
  void chrome.storage.local.set({ lastBackgroundTickAt: Date.now() })
})
