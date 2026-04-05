<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import logoUrl from '@assets/img/orasometer_logo.svg'
import BreakView from '@/popup/components/BreakView.vue'
import MainTimerView from '@/popup/components/MainTimerView.vue'
import SettingsView from '@/popup/components/SettingsView.vue'
import TaskListView from '@/popup/components/TaskListView.vue'
import { useOrasometerStore } from '@/stores/orasometer'

const store = useOrasometerStore()
const { view, hydrated, state } = storeToRefs(store)

watch(
  () => {
    const s = state.value
    if (!s) return false
    return Boolean(s.pomodoro.breakOfferPending || s.pomodoro.breakCountdownEndAt != null)
  },
  (showBreak) => {
    if (showBreak) store.view = 'break'
  },
)

let stopStorage: (() => void) | undefined

onMounted(async () => {
  stopStorage = store.startStorageSync()
  await store.refresh()
})

onUnmounted(() => stopStorage?.())
</script>

<template>
  <div class="popup">
    <header v-if="hydrated" class="header">
      <img class="logo" :src="logoUrl" alt="orasometer" width="232" height="32" />
      <button
        type="button"
        class="header-icon-btn"
        title="Settings"
        aria-label="Open settings"
        @click="store.view = 'settings'"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.06-.67-1.66-.86l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.6.19-1.16.48-1.66.86l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.06.67 1.66.86l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.6-.19 1.16-.48 1.66-.86l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
          />
        </svg>
      </button>
    </header>

    <p v-if="!hydrated" class="muted">Loading…</p>
    <MainTimerView v-else-if="view === 'main'" />
    <SettingsView v-else-if="view === 'settings'" />
    <BreakView v-else-if="view === 'break'" />
    <TaskListView v-else />
  </div>
</template>

<style scoped>
.popup {
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.logo {
  display: block;
  flex: 1;
  min-width: 0;
  max-width: 200px;
  height: auto;
}

.header-icon-btn {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 6px;
  cursor: pointer;
  color: #111;
  line-height: 0;
  border-radius: 8px;
}

.header-icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.muted {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}
</style>
