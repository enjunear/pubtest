<script setup lang="ts">
const tab = ref<'highest' | 'lowest'>('highest')
const party = ref('')
const chamber = ref('')
const state = ref('')

const { data } = await useFetch('/api/politicians', {
  query: computed(() => ({
    party: party.value || undefined,
    chamber: chamber.value || undefined,
    state: state.value || undefined,
    sort: 'approval',
    limit: 100,
  })),
})

const ranked = computed(() => {
  if (!data.value?.politicians) return []
  const withVotes = data.value.politicians.filter(p => p.totalVotes > 0)
  if (tab.value === 'lowest') return [...withVotes].reverse()
  return withVotes
})

const parties = ['Labor', 'Liberal', 'Nationals', 'Greens', 'Independent']
const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

useSeoMeta({
  title: 'Leaderboard',
  description: 'See which Australian politicians have the highest and lowest pub test approval ratings.',
  ogTitle: 'Leaderboard - The Pub Test',
  ogDescription: 'See which Australian politicians have the highest and lowest pub test approval ratings.',
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Leaderboard</h1>

    <!-- Tabs + filters -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <div class="flex gap-1.5">
        <UButton
          size="sm"
          :variant="tab === 'highest' ? 'solid' : 'outline'"
          label="Highest Approval"
          @click="tab = 'highest'"
        />
        <UButton
          size="sm"
          :variant="tab === 'lowest' ? 'solid' : 'outline'"
          label="Lowest Approval"
          @click="tab = 'lowest'"
        />
      </div>

      <select
        v-model="party"
        class="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5"
      >
        <option value="">All parties</option>
        <option v-for="p in parties" :key="p" :value="p">{{ p }}</option>
      </select>

      <select
        v-model="chamber"
        class="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5"
      >
        <option value="">Both chambers</option>
        <option value="house">House</option>
        <option value="senate">Senate</option>
      </select>

      <select
        v-model="state"
        class="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5"
      >
        <option value="">All states</option>
        <option v-for="s in states" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <!-- Ranking table -->
    <div v-if="ranked.length" class="space-y-2">
      <NuxtLink
        v-for="(polly, index) in ranked"
        :key="polly.id"
        :to="`/polly/${polly.id}`"
        class="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <!-- Rank -->
        <span class="w-8 text-center text-lg font-bold text-gray-400">
          {{ index + 1 }}
        </span>

        <!-- Photo -->
        <UAvatar
          v-if="polly.photoUrl"
          :src="polly.photoUrl"
          :alt="polly.name"
          size="sm"
        />
        <div
          v-else
          class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"
        >
          <UIcon name="i-heroicons-user" class="text-sm text-gray-400" />
        </div>

        <!-- Name + meta -->
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{{ polly.name }}</div>
          <div class="text-xs text-gray-500">
            {{ polly.party }} &middot;
            {{ polly.chamber === 'house' ? polly.electorateName : polly.state }}
          </div>
        </div>

        <!-- Approval bar -->
        <div class="w-32 hidden sm:block">
          <div class="h-2 bg-red-200 dark:bg-red-900/40 rounded-full overflow-hidden">
            <div
              class="h-full bg-green-500 rounded-full transition-all"
              :style="{ width: `${polly.approvalPct}%` }"
            />
          </div>
        </div>

        <!-- Approval % -->
        <div class="text-right w-16">
          <span
            class="text-lg font-bold"
            :class="(polly.approvalPct ?? 0) >= 50 ? 'text-green-600' : 'text-red-600'"
          >
            {{ polly.approvalPct }}%
          </span>
        </div>

        <!-- Vote count -->
        <span class="text-xs text-gray-400 w-16 text-right hidden sm:block">
          {{ polly.totalVotes }} votes
        </span>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-16">
      <UIcon name="i-heroicons-trophy" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="mt-4 text-gray-500">No politicians with votes yet. Start voting on stories!</p>
    </div>
  </div>
</template>
