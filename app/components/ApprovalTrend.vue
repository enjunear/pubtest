<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const props = defineProps<{
  politicianId: number
}>()

const period = ref<'30d' | '90d' | '1y' | 'all'>('30d')

const { data } = await useFetch<{
  politicianId: number
  period: string
  data: { date: string; approvalPct: number | null; totalVotes: number }[]
}>(`/api/politicians/${props.politicianId}/trend`, {
  query: computed(() => ({ period: period.value })),
})

const hasData = computed(() => {
  return data.value?.data && data.value.data.length > 1
})

const chartData = computed(() => {
  if (!data.value?.data) return { labels: [], datasets: [] }

  const points = data.value.data.filter(d => d.approvalPct !== null)

  return {
    labels: points.map(d => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    }),
    datasets: [
      {
        label: 'Approval %',
        data: points.map(d => d.approvalPct),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: points.length > 60 ? 0 : 3,
        pointHoverRadius: 5,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      min: 0,
      max: 100,
      ticks: {
        callback: (value: unknown) => `${value}%`,
      },
      grid: {
        color: 'rgba(128, 128, 128, 0.1)',
      },
    },
    x: {
      ticks: {
        maxTicksLimit: 8,
      },
      grid: {
        display: false,
      },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (context: { parsed: { y: number } }) => `Approval: ${context.parsed.y}%`,
      },
    },
  },
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
}

const periods = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All time' },
]
</script>

<template>
  <UCard>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">Approval Trend</h2>
        <div class="flex gap-1">
          <UButton
            v-for="p in periods"
            :key="p.value"
            size="xs"
            :variant="period === p.value ? 'solid' : 'ghost'"
            :label="p.label"
            @click="period = p.value as typeof period"
          />
        </div>
      </div>

      <div v-if="hasData" class="h-56">
        <Line :data="chartData" :options="chartOptions" />
      </div>

      <p v-else class="text-gray-400 text-sm text-center py-8">
        Not enough data yet for a trend chart. Check back once daily snapshots accumulate.
      </p>
    </div>
  </UCard>
</template>
