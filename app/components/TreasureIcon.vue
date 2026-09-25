<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Treasure } from '../game/engine'
import { drawTreasure } from '../game/renderer'

// Draws the same sprite the game uses, on a 64 x 56 canvas at the screen's pixel density.
const props = defineProps<{ kind: Treasure }>()
const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  const el = canvas.value!
  const scale = Math.min(window.devicePixelRatio || 1, 2) * 2
  el.width = 64 * scale; el.height = 56 * scale
  const ctx = el.getContext('2d')!
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  drawTreasure(ctx, props.kind, 32, 30)
})
</script>

<template>
  <canvas ref="canvas" width="64" height="56" aria-hidden="true" />
</template>
