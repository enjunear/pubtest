<script setup lang="ts">
const { data } = await useFetch<{
  electorateId: number
  electorateName: string
  state: string
  politicianId: number
  politicianName: string
  party: string
  approvalPct: number | null
}[]>('/api/heatmap')

useSeoMeta({
  title: 'Electorate Map',
  description: 'Explore Australian federal electorates and their MP approval ratings on an interactive heatmap.',
  ogTitle: 'Electorate Map - The Pub Test',
  ogDescription: 'Explore Australian federal electorates and their MP approval ratings on an interactive heatmap.',
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2">Electorate Map</h1>
    <p class="text-sm text-gray-500 mb-6">
      Each hexagon represents a federal electorate, coloured by their MP's approval rating.
      Click to view the politician's profile.
    </p>

    <ElectorateHeatmap v-if="data?.length" :data="data" />

    <div v-else class="text-center py-16">
      <UIcon name="i-heroicons-map" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="mt-4 text-gray-500">No heatmap data available yet.</p>
    </div>
  </div>
</template>
