<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: stats, status } = await useFetch('/api/admin/stats')

const cards = computed(() => {
  const s = stats.value as Record<string, number> | null
  if (!s) return []
  return [
    { label: 'Stories today', value: s.storiesToday, icon: 'i-heroicons-newspaper', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Votes today', value: s.votesToday, icon: 'i-heroicons-hand-thumb-up', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'New users today', value: s.usersToday, icon: 'i-heroicons-user-plus', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Pending moderation', value: s.pendingStories, icon: 'i-heroicons-clock', color: 'text-amber-400', bg: 'bg-amber-500/10', to: '/admin/stories?status=moderation' },
    { label: 'Active feeds', value: s.activeFeeds, icon: 'i-heroicons-rss', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Feed errors', value: s.errorFeeds, icon: 'i-heroicons-exclamation-triangle', color: 'text-red-400', bg: 'bg-red-500/10' },
  ]
})

const totals = computed(() => {
  const s = stats.value as Record<string, number> | null
  if (!s) return []
  return [
    { label: 'Total stories', value: s.totalStories },
    { label: 'Total votes', value: s.totalVotes },
    { label: 'Total users', value: s.totalUsers },
    { label: 'Total politicians', value: s.totalPoliticians },
  ]
})

function formatNum(n: number) {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000) return n.toLocaleString()
  return String(n)
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight mb-6">Dashboard</h1>

    <div v-if="status === 'pending'" class="text-gray-400 text-sm">Loading stats...</div>

    <template v-else-if="stats">
      <!-- Today's activity -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <component
          :is="card.to ? 'NuxtLink' : 'div'"
          v-for="card in cards"
          :key="card.label"
          :to="card.to"
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition-all hover:border-gray-300 dark:hover:border-gray-700"
          :class="{ 'cursor-pointer': card.to }"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-3xl font-bold font-mono tracking-tight" :class="card.color">
                {{ formatNum(card.value) }}
              </p>
              <p class="text-xs text-gray-500 mt-1 font-medium">{{ card.label }}</p>
            </div>
            <div class="p-2 rounded-lg" :class="card.bg">
              <UIcon :name="card.icon" class="text-lg" :class="card.color" />
            </div>
          </div>
        </component>
      </div>

      <!-- All-time totals -->
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">All time</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="total in totals"
          :key="total.label"
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-5 py-4"
        >
          <p class="text-xl font-bold font-mono tracking-tight">{{ formatNum(total.value) }}</p>
          <p class="text-xs text-gray-500 mt-0.5">{{ total.label }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
