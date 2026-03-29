<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { clampTargetSec } from '@/lib/orasometer-state'
import { clampBreakDurationSec } from '@/lib/pomodoro'
import { useOrasometerStore } from '@/stores/orasometer'

const store = useOrasometerStore()
const { state } = storeToRefs(store)

const workHours = ref(8)
const breakMinutes = ref(5)
const savedFlash = ref(false)

watch(
  () => state.value,
  (s) => {
    if (!s) return
    workHours.value = Math.round((s.main.targetDurationSec / 3600) * 1000) / 1000
    breakMinutes.value = Math.round(s.pomodoro.breakDurationSec / 60)
  },
  { immediate: true },
)

async function save() {
  const h = Number(workHours.value)
  const m = Number(breakMinutes.value)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return
  const mainTargetDurationSec = clampTargetSec(Math.round(h * 3600))
  const breakDurationSec = clampBreakDurationSec(Math.round(m * 60))
  await store.savePreferences(mainTargetDurationSec, breakDurationSec)
  savedFlash.value = true
  window.setTimeout(() => {
    savedFlash.value = false
  }, 1200)
}
</script>

<template>
  <section v-if="state" class="settings">
    <header class="head">
      <button type="button" class="back" aria-label="Back to timer" @click="store.view = 'main'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span class="title">Settings</span>
    </header>

    <div class="field">
      <label class="label" for="work-hours">Main work session</label>
      <div class="row">
        <input
          id="work-hours"
          v-model.number="workHours"
          class="input"
          type="number"
          min="0.01"
          max="24"
          step="0.25"
          :disabled="state.main.phase === 'running'"
        />
        <span class="suffix">hours</span>
      </div>
      <p v-if="state.main.phase === 'running'" class="hint muted">
        Pause the main timer to change session length.
      </p>
    </div>

    <div class="field">
      <label class="label" for="break-mins">Break length</label>
      <div class="row">
        <input
          id="break-mins"
          v-model.number="breakMinutes"
          class="input"
          type="number"
          min="1"
          max="60"
          step="1"
        />
        <span class="suffix">minutes</span>
      </div>
      <p class="hint muted">Used when you press Play on the break window (1–60 min).</p>
    </div>

    <button type="button" class="save" @click="save()">
      {{ savedFlash ? 'Saved' : 'Save' }}
    </button>
  </section>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 260px;
}

.head {
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

.title {
  font-weight: 600;
  font-size: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input {
  width: 5.5rem;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.suffix {
  font-size: 0.95rem;
  color: #555;
}

.hint {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.35;
}

.muted {
  color: #888;
}

.save {
  align-self: flex-start;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  background: #07e092;
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}

.save:hover {
  filter: brightness(1.03);
}
</style>
