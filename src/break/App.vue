<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import logoUrl from '@assets/img/orasometer_logo.svg'
import { formatHms } from '@/lib/orasometer-state'
import { useOrasometerStore } from '@/stores/orasometer'

const store = useOrasometerStore()
const { state, hydrated } = storeToRefs(store)

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

let stopStorage: (() => void) | undefined

onMounted(async () => {
  stopStorage = store.startStorageSync()
  await store.refresh()
  clock = setInterval(() => {
    now.value = Date.now()
  }, 200)
})

onUnmounted(() => {
  stopStorage?.()
  if (clock != null) clearInterval(clock)
})
</script>

<template>
  <main v-if="hydrated && state" class="break">
    <img class="logo" :src="logoUrl" alt="orasometer" width="232" height="32" />
    <p class="eyebrow">Pomodoro</p>
    <h1 class="headline">Have a break</h1>

    <section v-if="countdownActive" class="panel">
      <p class="label">Break ends in</p>
      <p class="time">{{ breakRemainingLabel }}</p>
      <button type="button" class="secondary" @click="store.breakSkip()">Skip</button>
    </section>

    <section v-else class="panel">
      <p class="label">Break length</p>
      <p class="time">{{ breakPlannedLabel }}</p>
      <div class="actions">
        <button type="button" class="primary" @click="store.breakStartCountdown()">Play</button>
        <button v-if="offerPending" type="button" class="secondary" @click="store.breakDismissOffer()">
          Dismiss
        </button>
      </div>
    </section>

    <p class="hint muted">
      Play starts the countdown and pauses your main work timer. Skip ends the break early.
    </p>
  </main>
  <p v-else class="loading">Loading…</p>
</template>

<style scoped>
.break {
  padding: 20px;
  max-width: 360px;
  margin: 0 auto;
}

.logo {
  display: block;
  max-width: 200px;
  height: auto;
  margin-bottom: 12px;
}

.eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  margin: 0 0 4px;
}

.headline {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 20px;
  color: #111;
}

.panel {
  background: #f7f7f8;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
}

.label {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: #555;
}

.time {
  margin: 0 0 16px;
  font-size: 2rem;
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
  margin: 16px 0 0;
  font-size: 0.8rem;
  line-height: 1.4;
}

.muted {
  color: #888;
}

.loading {
  padding: 24px;
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}
</style>
