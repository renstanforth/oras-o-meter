<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrasometerStore } from '@/stores/orasometer'

const store = useOrasometerStore()
const { displayRemainingLabel, progress, state } = storeToRefs(store)

const R = 45
const C = 2 * Math.PI * R

const strokeDashoffset = computed(() => C * (1 - progress.value))

const adjusting = computed(() => state.value?.main.phase === 'running')
</script>

<template>
  <section v-if="state" class="main-timer">
    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="ring-track" cx="60" cy="60" :r="R" />
        <circle
          class="ring-progress"
          cx="60"
          cy="60"
          :r="R"
          :stroke-dasharray="C"
          :stroke-dashoffset="strokeDashoffset"
        />
      </svg>
      <div class="ring-center">
        <span class="time">{{ displayRemainingLabel }}</span>
        <button
          type="button"
          class="icon-btn sub"
          title="Tasks (stopwatch)"
          aria-label="Open task list"
          @click="store.view = 'tasks'"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="13" r="7" />
            <path d="M12 9v4l2 2M12 6V4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <div class="stepper">
      <button
        type="button"
        class="step"
        :disabled="adjusting"
        aria-label="Subtract 15 seconds"
        @click="store.adjust(-15)"
      >
        −
      </button>
      <button
        type="button"
        class="step"
        :disabled="adjusting"
        aria-label="Add 15 seconds"
        @click="store.adjust(15)"
      >
        +
      </button>
    </div>

    <button
      v-if="state.main.phase !== 'running'"
      type="button"
      class="primary"
      @click="store.start()"
    >
      Start
    </button>
    <button v-else type="button" class="primary muted-bg" @click="store.pause()">Pause</button>

    <button type="button" class="secondary-outline" @click="store.takeBreak()">Take a break</button>

    <button type="button" class="link" @click="store.reset()">Reset</button>
  </section>
</template>

<style scoped>
.main-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.ring-wrap {
  position: relative;
  width: 200px;
  height: 200px;
}

.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-track {
  fill: none;
  stroke: #e6e0f5;
  stroke-width: 8;
}

.ring-progress {
  fill: none;
  stroke: #07e092;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.2s ease;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  pointer-events: none;
}

.ring-center .icon-btn {
  pointer-events: auto;
}

.time {
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.icon-btn {
  border: none;
  background: transparent;
  color: #111;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  line-height: 0;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.icon-btn.sub {
  margin-top: 2px;
}

.stepper {
  display: flex;
  justify-content: space-between;
  width: 200px;
  margin-top: -8px;
  padding: 0 4px;
}

.step {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: none;
  background: #111;
  color: #fff;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.step:hover:not(:disabled) {
  opacity: 0.92;
}

.step:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.primary {
  width: 100%;
  max-width: 220px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  background: #07e092;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.primary.muted-bg {
  background: #0b9f6e;
}

.primary:hover {
  filter: brightness(1.03);
}

.link {
  border: none;
  background: none;
  color: #888;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: none;
  padding: 4px;
}

.link:hover {
  color: #555;
}

.secondary-outline {
  width: 100%;
  max-width: 220px;
  padding: 10px 16px;
  border: 1px solid #ccc;
  border-radius: 12px;
  background: #fff;
  color: #333;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.secondary-outline:hover {
  border-color: #07e092;
  color: #0b9f6e;
}
</style>
