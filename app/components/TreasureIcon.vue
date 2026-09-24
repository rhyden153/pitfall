<script setup lang="ts">
defineProps<{ kind: string }>()
</script>

<template>
  <svg viewBox="0 0 64 56" fill="none" aria-hidden="true">
    <ellipse cx="32" cy="47" rx="23" ry="3" fill="currentColor" opacity=".07" />
    <g v-if="kind === 'gold' || kind === 'silver'">
      <path d="m8 41 9-24h30l9 24H8Z" :fill="kind === 'gold' ? '#b98a3c' : '#82938b'" />
      <path d="m17 17-3 10h35l-2-10H17Z" :fill="kind === 'gold' ? '#f2d383' : '#d7e2d7'" />
      <path d="M14 27h35l4 12H10l4-12Z" :fill="kind === 'gold' ? '#dfb75d' : '#afc0b6'" />
      <path d="m22 20-1 4h9" stroke="white" opacity=".5" stroke-width="2" />
    </g>
    <g v-else-if="kind === 'bag'">
      <path d="m24 8 8 3 9-3-5 13c25 27-31 37-28 15 1-6 10-13 20-15L24 8Z" fill="#c7a671" />
      <path d="M26 21h13" stroke="#795a37" stroke-width="3" stroke-linecap="round" />
      <path d="M36 28c-8-4-12 5-3 6 8 1 3 9-5 5m5-14v18" stroke="#7d6036" stroke-width="2.3" />
    </g>
    <g v-else>
      <circle cx="32" cy="34" r="13" stroke="#bd8f3f" stroke-width="5" />
      <path d="m17 15 7-9h16l7 9-15 16-15-16Z" fill="#d5e5d9" stroke="#88a59a" stroke-width="1.5" />
      <path d="M17 15h30M24 6l8 25 8-25" stroke="#88a59a" stroke-width="1.5" />
      <path d="m48 4 1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4Z" fill="#c99c4d" />
    </g>
  </svg>
</template>
