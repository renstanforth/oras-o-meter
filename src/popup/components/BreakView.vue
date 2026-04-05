<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { formatHms } from '@/lib/orasometer-state'
import { useOrasometerStore } from '@/stores/orasometer'

const store = useOrasometerStore()
const { state } = storeToRefs(store)

const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

const breakRemainingSec = computed(() => {
  const s = state.value
  const end = s?.pomodoro.breakCountdownEndAt
  if (end == null) return 0
  return Math.max(0, Math.ceil((end - now.value) / 1000))
})

const breakRemainingLabel = computed(() => formatHms(breakRemainingSec.value))

const breakPlannedLabel = computed(() =>
  formatHms(state.value?.pomodoro.breakDurationSec ?? 0),
)

const countdownActive = computed(() => state.value?.pomodoro.breakCountdownEndAt != null)

const offerPending = computed(() => state.value?.pomodoro.breakOfferPending === true)

onMounted(() => {
  clock = setInterval(() => {
    now.value = Date.now()
  }, 200)
})

onUnmounted(() => {
  if (clock != null) clearInterval(clock)
})

/** Service worker ended the break countdown; return to main timer. */
watch(
  () => state.value?.pomodoro.breakCountdownEndAt,
  (end, prev) => {
    if (typeof prev !== 'number') return
    if (end != null) return
    if (state.value?.pomodoro.breakOfferPending) return
    if (store.view === 'break') store.view = 'main'
  },
)

async function skip() {
  await store.breakSkip()
  store.view = 'main'
}

async function dismiss() {
  await store.breakDismissOffer()
  store.view = 'main'
}
</script>

<template>
  <section v-if="state" class="break">
    <header class="head">
      <button type="button" class="back" aria-label="Back to timer" @click="store.view = 'main'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span class="title">Break</span>
    </header>

    <p class="eyebrow">Pomodoro</p>
    <h1 class="headline">Have a break</h1>

    <section v-if="countdownActive" class="panel">
      <p class="label">Break ends in</p>
      <p class="time">{{ breakRemainingLabel }}</p>
      <button type="button" class="secondary" @click="skip()">Skip</button>
    </section>

    <section v-else class="panel">
      <p class="label">Break length</p>
      <p class="time">{{ breakPlannedLabel }}</p>
      <div class="actions">
        <button type="button" class="primary" @click="store.breakStartCountdown()">Play</button>
        <button v-if="offerPending" type="button" class="secondary" @click="dismiss()">Dismiss</button>
      </div>
    </section>

    <p class="hint muted">Play pauses the main work timer until the break ends or you skip.</p>
  </section>
</template>

<style scoped>
.break {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  margin: 0;
}

.headline {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  color: #111;
}

.panel {
  background: #f7f7f8;
  border-radius: 16px;
  padding: 18px;
  text-align: center;
}

.label {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: #555;
}

.time {
  margin: 0 0 14px;
  font-size: 1.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #111;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.primary {
  border: none;
  border-radius: 12px;
  padding: 12px 28px;
  background: #07e092;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.primary:hover {
  filter: brightness(1.03);
}

.secondary {
  border: 1px solid #ccc;
  border-radius: 12px;
  padding: 10px 20px;
  background: #fff;
  color: #333;
  font-size: 0.95rem;
  cursor: pointer;
}

.secondary:hover {
  border-color: #999;
}

.hint {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
}

.muted {
  color: #888;
}
</style>
