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
  <main class="popup">
    <header class="header">
      <img class="logo" :src="logoUrl" alt="orasometer" width="232" height="32" />
    </header>
    <p v-if="!session.hydrated" class="muted">Loading…</p>
    <p v-else class="muted">Popup ready. Session: {{ session.session ? 'restored' : 'empty' }}</p>
  </main>
</template>
