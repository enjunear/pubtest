<script setup lang="ts">
import { hexLayout, approvalColor } from '~/utils/hex-cartogram'

interface HeatmapEntry {
  electorateId: number
  electorateName: string
  state: string
  politicianId: number
  politicianName: string
  party: string
  approvalPct: number | null
}

const props = defineProps<{
  data: HeatmapEntry[]
}>()

// Map electorate name → heatmap data
const dataMap = computed(() => {
  const map = new Map<string, HeatmapEntry>()
  for (const entry of props.data) {
    map.set(entry.electorateName, entry)
  }
  return map
})

// Hex geometry constants
const hexSize = 18
const hexWidth = hexSize * 2
const hexHeight = Math.sqrt(3) * hexSize

// Compute viewBox from layout bounds
const bounds = computed(() => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const hex of hexLayout) {
    const x = hex.col * hexWidth * 0.75
    const y = hex.row * hexHeight + (hex.col % 2 === 1 ? hexHeight / 2 : 0)
    minX = Math.min(minX, x - hexSize)
    minY = Math.min(minY, y - hexHeight / 2)
    maxX = Math.max(maxX, x + hexSize)
    maxY = Math.max(maxY, y + hexHeight / 2)
  }
  const pad = 10
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  }
})

// Hex polygon points (flat-top hexagon)
function hexPoints(cx: number, cy: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)
    const x = cx + hexSize * Math.cos(angle)
    const y = cy + hexSize * Math.sin(angle)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

// Compute hex positions with data
const hexes = computed(() => {
  return hexLayout.map(hex => {
    const cx = hex.col * hexWidth * 0.75
    const cy = hex.row * hexHeight + (hex.col % 2 === 1 ? hexHeight / 2 : 0)
    const entry = dataMap.value.get(hex.electorate)
    return {
      ...hex,
      cx,
      cy,
      points: hexPoints(cx, cy),
      entry,
      color: entry ? approvalColor(entry.approvalPct) : '#E5E7EB',
    }
  })
})

const hoveredHex = ref<typeof hexes.value[0] | null>(null)

const tooltipStyle = computed(() => {
  if (!hoveredHex.value) return { display: 'none' }
  return { display: 'block' }
})
</script>

<template>
  <div class="relative">
    <!-- Legend -->
    <div class="flex items-center justify-center gap-4 mb-4 text-xs text-gray-500">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" :style="{ background: approvalColor(0) }" />
        <span>0%</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" :style="{ background: approvalColor(25) }" />
        <span>25%</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" :style="{ background: approvalColor(50) }" />
        <span>50%</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" :style="{ background: approvalColor(75) }" />
        <span>75%</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded" :style="{ background: approvalColor(100) }" />
        <span>100%</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded bg-gray-300" />
        <span>No data</span>
      </div>
    </div>

    <!-- SVG Map -->
    <svg
      :viewBox="`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`"
      class="w-full max-h-[600px]"
      preserveAspectRatio="xMidYMid meet"
    >
      <NuxtLink
        v-for="hex in hexes"
        :key="hex.electorate"
        :to="hex.entry ? `/polly/${hex.entry.politicianId}` : undefined"
      >
        <polygon
          :points="hex.points"
          :fill="hex.color"
          stroke="white"
          stroke-width="1.5"
          class="cursor-pointer transition-opacity hover:opacity-80"
          @mouseenter="hoveredHex = hex"
          @mouseleave="hoveredHex = null"
        />
      </NuxtLink>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="hoveredHex"
      class="absolute top-2 right-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 text-sm pointer-events-none z-10 border border-gray-200 dark:border-gray-700"
    >
      <div class="font-semibold">{{ hoveredHex.electorate }}</div>
      <div class="text-xs text-gray-500">{{ hoveredHex.state }}</div>
      <template v-if="hoveredHex.entry">
        <div class="mt-1">{{ hoveredHex.entry.politicianName }}</div>
        <div class="text-xs text-gray-500">{{ hoveredHex.entry.party }}</div>
        <div
          v-if="hoveredHex.entry.approvalPct !== null"
          class="mt-1 font-bold"
          :class="hoveredHex.entry.approvalPct >= 50 ? 'text-green-600' : 'text-red-600'"
        >
          {{ hoveredHex.entry.approvalPct }}% approval
        </div>
        <div v-else class="mt-1 text-gray-400 text-xs">No votes yet</div>
      </template>
      <div v-else class="mt-1 text-gray-400 text-xs">No data</div>
    </div>
  </div>
</template>
