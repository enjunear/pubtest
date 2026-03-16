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
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const period = ref<'30d' | '90d' | '1y' | 'all'>('90d')

type PartyTrendRow = {
  date: string
  party: string
  avgApproval: number
  totalVotes: number
  politicianCount: number
}

type OverallTrendRow = {
  date: string
  avgApproval: number
  totalVotes: number
  politicianCount: number
}

const { data } = await useFetch<{
  period: string
  partyTrends: PartyTrendRow[]
  overallTrend: OverallTrendRow[]
}>('/api/trends/parties', {
  query: computed(() => ({ period: period.value })),
})

const hasData = computed(() => {
  return data.value?.overallTrend && data.value.overallTrend.length > 1
})

// Party colours that match Australian political conventions
const partyColors: Record<string, string> = {
  Labor: 'rgb(220, 38, 38)',
  Liberal: 'rgb(37, 99, 235)',
  Nationals: 'rgb(22, 163, 74)',
  Greens: 'rgb(74, 222, 128)',
  Independent: 'rgb(156, 163, 175)',
}

const chartData = computed(() => {
  if (!data.value?.partyTrends) return { labels: [], datasets: [] }

  // Get unique dates and parties
  const dates = [...new Set(data.value.partyTrends.map(r => r.date))].sort()
  const parties = [...new Set(data.value.partyTrends.map(r => r.party))]

  // Only show major parties
  const majorParties = parties.filter(p => ['Labor', 'Liberal', 'Greens', 'Nationals'].includes(p))

  const datasets = majorParties.map(party => {
    const partyData = new Map(
      data.value!.partyTrends
        .filter(r => r.party === party)
        .map(r => [r.date, r.avgApproval]),
    )

    return {
      label: party,
      data: dates.map(d => partyData.get(d) ?? null),
      borderColor: partyColors[party] || 'rgb(156, 163, 175)',
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: dates.length > 60 ? 0 : 2,
      pointHoverRadius: 5,
      borderWidth: 2,
    }
  })

  // Add overall "Parliament Mood" line
  if (data.value.overallTrend.length > 0) {
    const overallMap = new Map(
      data.value.overallTrend.map(r => [r.date, r.avgApproval]),
    )
    datasets.unshift({
      label: 'Parliament Mood',
      data: dates.map(d => overallMap.get(d) ?? null),
      borderColor: 'rgb(234, 179, 8)',
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 3,
    })
  }

  return {
    labels: dates.map(d => {
      const date = new Date(d)
      return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    }),
    datasets,
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
        label: (context: { dataset: { label: string }, parsed: { y: number } }) =>
          `${context.dataset.label}: ${context.parsed.y}%`,
      },
    },
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle' as const,
        padding: 16,
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
        <h2 class="font-semibold">Party Approval Trends</h2>
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

      <div v-if="hasData" class="h-72">
        <Line :data="chartData" :options="chartOptions" />
      </div>

      <p v-else class="text-gray-400 text-sm text-center py-8">
        Not enough data yet for party trends. Check back once daily snapshots accumulate.
      </p>
    </div>
  </UCard>
</template>
