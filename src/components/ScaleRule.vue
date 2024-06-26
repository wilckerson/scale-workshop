<script setup lang="ts">
import type { Scale } from '@/scale'
import { computed } from 'vue'
import { mmod, valueToCents } from 'xen-dev-utils'

const props = defineProps<{
  scale: Scale
  orientation: 'horizontal' | 'vertical'
}>()

const ticksAndColors = computed(() => {
  const equaveCents = valueToCents(props.scale.equaveRatio)
  const result = []

  for (let i = 0; i < props.scale.size; ++i) {
    const cents = valueToCents(props.scale.intervalRatios[i])
    const tick = cents / equaveCents
    let color = 'var(--color-text)'
    if (tick < 0) {
      color = 'blue'
    } else if (tick > 1) {
      color = 'red'
    }
    if (!isNaN(tick) && isFinite(tick)) {
      // mmod(1, 1) === 0 so we don't have to push the unison tick
      result.push([`${0.5 + 99 * mmod(tick, 1)}%`, color])
    }
  }
  // mmod(1, 1) === 0, so we have to manually push the equave tick
  result.push(['99.5%', 'var(--color-text)'])
  return result
})
</script>

<template>
  <svg width="100%" height="10" v-if="orientation === 'horizontal'">
    <line x1="0.5%" y1="50%" x2="99.5%" y2="50%" style="stroke: var(--color-text)" />
    <line
      v-for="([tick, color], i) of ticksAndColors"
      :key="i"
      :x1="tick"
      y1="5%"
      :x2="tick"
      y2="95%"
      :style="'stroke:' + color + ';'"
    />
  </svg>
  <svg width="10" height="100%" v-else>
    <line y1="0.5%" x1="50%" y2="99.5%" x2="50%" style="stroke: var(--color-text)" />
    <line
      v-for="([tick, color], i) of ticksAndColors"
      :key="i"
      :y1="tick"
      x1="5%"
      :y2="tick"
      x2="95%"
      :style="'stroke:' + color + ';'"
    />
  </svg>
</template>
