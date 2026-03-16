<script setup lang="ts">
type Mover = {
  politicianId: number
  name: string
  displayName: string
  party: string
  chamber: string
  photoUrl: string | null
  state: string | null
  electorateName: string | null
  currentApproval: number
  previousApproval: number
  currentVotes: number
  change: number
}

const { data } = await useFetch<{
  mostImproved: Mover[]
  biggestDrop: Mover[]
}>('/api/politicians/movers')

const hasMovers = computed(() => {
  return data.value &&
    (data.value.mostImproved.length > 0 || data.value.biggestDrop.length > 0)
})
</script>

<template>
  <div v-if="hasMovers" class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Most Improved -->
    <UCard v-if="data?.mostImproved.length">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-trending-up" class="text-green-500 text-lg" />
          <span class="font-semibold">Most Improved</span>
          <span class="text-xs text-gray-400">30 days</span>
        </div>
      </template>

      <div class="space-y-2">
        <NuxtLink
          v-for="mover in data.mostImproved"
          :key="mover.politicianId"
          :to="`/polly/${mover.politicianId}`"
          class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <UAvatar
            v-if="mover.photoUrl"
            :src="mover.photoUrl"
            :alt="mover.name"
            size="xs"
          />
          <div
            v-else
            class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"
          >
            <UIcon name="i-heroicons-user" class="text-xs text-gray-400" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ mover.name }}</div>
            <div class="text-xs text-gray-500">{{ mover.party }}</div>
          </div>

          <div class="text-right">
            <span class="text-sm font-bold text-green-600">+{{ mover.change }}%</span>
            <div class="text-xs text-gray-400">{{ mover.currentApproval }}%</div>
          </div>
        </NuxtLink>
      </div>
    </UCard>

    <!-- Biggest Drop -->
    <UCard v-if="data?.biggestDrop.length">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-trending-down" class="text-red-500 text-lg" />
          <span class="font-semibold">Biggest Drop</span>
          <span class="text-xs text-gray-400">30 days</span>
        </div>
      </template>

      <div class="space-y-2">
        <NuxtLink
          v-for="mover in data.biggestDrop"
          :key="mover.politicianId"
          :to="`/polly/${mover.politicianId}`"
          class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <UAvatar
            v-if="mover.photoUrl"
            :src="mover.photoUrl"
            :alt="mover.name"
            size="xs"
          />
          <div
            v-else
            class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"
          >
            <UIcon name="i-heroicons-user" class="text-xs text-gray-400" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ mover.name }}</div>
            <div class="text-xs text-gray-500">{{ mover.party }}</div>
          </div>

          <div class="text-right">
            <span class="text-sm font-bold text-red-600">{{ mover.change }}%</span>
            <div class="text-xs text-gray-400">{{ mover.currentApproval }}%</div>
          </div>
        </NuxtLink>
      </div>
    </UCard>
  </div>
</template>
