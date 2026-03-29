<script setup lang="ts">
import { onMounted } from 'vue'
import logoUrl from '@assets/img/orasometer_logo.svg'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

onMounted(() => {
  void session.hydrateFromStorage()
})
</script>

<template>
  <main class="break">
    <img class="logo" :src="logoUrl" alt="orasometer" width="232" height="32" />
    <p class="eyebrow">Pomodoro</p>
    <h1 class="headline">Have a break</h1>
    <p v-if="!session.hydrated" class="muted">Loading…</p>
    <p v-else class="muted">Break window (hydrate from storage works here too).</p>
  </main>
</template>
