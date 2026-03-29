<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { formatHms, isMainEffectivelyRunning } from '@/lib/orasometer-state'
import { useOrasometerStore } from '@/stores/orasometer'

const store = useOrasometerStore()
const { state, totalTaskSec } = storeToRefs(store)

/** Active row while main is running and no break countdown — time is accruing (README). */
function isAccruingTask(id: string) {
  const s = state.value
  if (!s) return false
  return s.tasks.activeTaskId === id && isMainEffectivelyRunning(s)
}

function isSelectedTask(id: string) {
  return state.value?.tasks.activeTaskId === id
}

function toggleTask(id: string) {
  void store.taskSetActive(isSelectedTask(id) ? null : id)
}

function rowToggleLabel(id: string) {
  if (isSelectedTask(id)) {
    return isAccruingTask(id)
      ? 'Stop accruing for this task (deselect)'
      : 'Deselect current task'
  }
  return 'Set as current task'
}

function onTitleInput(id: string, ev: Event) {
  const el = ev.target as HTMLInputElement
  void store.taskSetTitle(id, el.value)
}
</script>

<template>
  <section v-if="state" class="task-list">
    <header class="tl-head">
      <button type="button" class="back" aria-label="Back to timer" @click="store.view = 'main'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span class="tl-title">Tasks</span>
    </header>

    <ul class="rows">
      <li v-for="t in state.tasks.items" :key="t.id" class="row">
        <div class="row-top">
          <span class="row-time">{{ formatHms(t.accumulatedSec) }}</span>
          <div class="row-actions">
            <button
              type="button"
              class="row-toggle"
              :aria-label="rowToggleLabel(t.id)"
              @click="toggleTask(t.id)"
            >
              <svg
                v-if="isAccruingTask(t.id)"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 6l12 6-12 6V6z" />
              </svg>
            </button>
            <button
              type="button"
              class="row-remove"
              aria-label="Remove task"
              @click="store.taskRemove(t.id)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div class="row-meta">
          <span
            class="dot"
            :class="{
              on: isAccruingTask(t.id),
              sel: isSelectedTask(t.id) && !isAccruingTask(t.id),
            }"
          />
          <input
            class="row-input"
            type="text"
            :value="t.title"
            @input="onTitleInput(t.id, $event)"
          />
        </div>
      </li>
    </ul>

    <button type="button" class="add" @click="store.taskAdd()">+ Add task</button>

    <footer class="tl-foot">
      <span class="muted">Total</span>
      <strong>{{ formatHms(totalTaskSec) }}</strong>
    </footer>
  </section>
</template>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 260px;
}

.tl-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back {
  border: none;
  background: none;
  padding: 4px;
  cursor: pointer;
  color: #111;
  line-height: 0;
  border-radius: 8px;
}

.back:hover {
  background: rgba(0, 0, 0, 0.06);
}

.tl-title {
  font-weight: 600;
  font-size: 1rem;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  background: #f7f7f8;
  border-radius: 14px;
  padding: 12px 14px;
}

.row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.row-time {
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.row-toggle {
  border: none;
  background: none;
  color: #333;
  cursor: pointer;
  padding: 4px;
  line-height: 0;
  border-radius: 8px;
}

.row-toggle:hover {
  background: rgba(0, 0, 0, 0.06);
}

.row-remove {
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
  padding: 4px;
  line-height: 0;
  border-radius: 8px;
}

.row-remove:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #c00;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 2px solid #07e092;
  flex-shrink: 0;
}

.dot.on {
  background: #07e092;
}

.dot.sel {
  background: transparent;
  border-style: solid;
}

.row-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: #333;
  min-width: 0;
}

.row-input:focus {
  outline: none;
}

.add {
  align-self: flex-start;
  border: 1px dashed #ccc;
  background: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.9rem;
  cursor: pointer;
  color: #444;
}

.add:hover {
  border-color: #07e092;
  color: #07e092;
}

.tl-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #eee;
  font-size: 0.95rem;
}

.muted {
  color: #888;
}
</style>
