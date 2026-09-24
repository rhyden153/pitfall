<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
const paths: Record<string, string> = {
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4 5-2.5 5.5L8 16l2.5-5.5L16 8Z',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  sound: 'M11 4 5 9H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  mute: 'M11 4 5 9H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  pause: 'M8 5v14M16 5v14',
  play: 'm8 4 12 8-12 8V4Z',
  book: 'M12 5v16M3 3c4 0 6 0 9 2 3-2 5-2 9-2v15c-4 0-6 0-9 3-3-3-5-3-9-3V3Z',
  map: 'm2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3V5Zm6-3v17m8-14v17',
  close: 'm6 6 12 12M6 18 18 6',
  heart: 'M12 20 3.8 12C-2 6 6 0 12 6c6-6 14 0 8.2 6L12 20Z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v6h4',
  flag: 'M5 22V3c6-4 9 4 15 0v11c-6 4-9-4-15 0',
  restart: 'M3 10a9 9 0 1 1 2 8M3 3v7h7',
  leaf: 'M20 3C7 1 1 8 5 16s17 4 15-13ZM3 22 16 8',
  chevron: 'm9 5 7 7-7 7',
}
</script>

<template>
  <svg :width="size || 20" :height="size || 20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.compass" /></svg>
</template>
