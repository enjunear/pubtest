<script setup lang="ts">
const search = ref('')
const party = ref('')
const chamber = ref('')
const state = ref('')
const page = ref(1)

const { data } = await useFetch('/api/politicians', {
  query: computed(() => ({
    search: search.value || undefined,
    party: party.value || undefined,
    chamber: chamber.value || undefined,
    state: state.value || undefined,
    sort: 'name',
    page: page.value,
    limit: 50,
  })),
})

function resetFilters() {
  search.value = ''
  party.value = ''
  chamber.value = ''
  state.value = ''
  page.value = 1
}

const parties = ['Labor', 'Liberal', 'Nationals', 'Greens', 'Independent']
const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

useSeoMeta({
  title: 'Politicians',
  description: 'Browse Australian federal politicians and their pub test approval ratings.',
  ogTitle: 'Politicians - The Pub Test',
  ogDescription: 'Browse Australian federal politicians and their pub test approval ratings.',
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Politicians</h1>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <UInput
        v-model="search"
        placeholder="Search by name..."
        icon="i-heroicons-magnifying-glass"
        size="sm"
        class="w-56"
        @input="page = 1"
      />

      <select
        v-model="party"
        class="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5"
        @change="page = 1"
      >
        <option value="">All parties</option>
        <option v-for="p in parties" :key="p" :value="p">{{ p }}</option>
      </select>

      <select
        v-model="chamber"
        class="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5"
        @change="page = 1"
      >
        <option value="">Both chambers</option>
        <option value="house">House</option>
        <option value="senate">Senate</option>
      </select>

      <select
        v-model="state"
        class="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5"
        @change="page = 1"
      >
        <option value="">All states</option>
        <option v-for="s in states" :key="s" :value="s">{{ s }}</option>
      </select>

      <UButton
        v-if="search || party || chamber || state"
        variant="ghost"
        size="sm"
        label="Clear"
        @click="resetFilters"
      />
    </div>

    <!-- Grid -->
    <div v-if="data?.politicians?.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="polly in data.politicians"
        :key="polly.id"
        :to="`/polly/${polly.id}`"
        class="block"
      >
        <UCard class="hover:ring-1 hover:ring-primary/30 transition-all h-full">
          <div class="flex items-center gap-3">
            <UAvatar
              v-if="polly.photoUrl"
              :src="polly.photoUrl"
              :alt="polly.name"
              size="lg"
            />
            <div
              v-else
              class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"
            >
              <UIcon name="i-heroicons-user" class="text-gray-400" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{{ polly.name }}</div>
              <div class="text-xs text-gray-500">{{ polly.party }}</div>
              <div class="text-xs text-gray-400">
                {{ polly.chamber === 'house' ? polly.electorateName : polly.state }}
              </div>
            </div>

            <div class="text-right flex-shrink-0">
              <div
                v-if="polly.approvalPct !== null"
                class="text-lg font-bold"
                :class="polly.approvalPct >= 50 ? 'text-green-600' : 'text-red-600'"
              >
                {{ polly.approvalPct }}%
              </div>
              <div v-else class="text-sm text-gray-300">--</div>
              <div v-if="polly.totalVotes > 0" class="text-xs text-gray-400">
                {{ polly.totalVotes }} votes
              </div>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-16">
      <UIcon name="i-heroicons-user-group" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="mt-4 text-gray-500">No politicians found.</p>
    </div>

    <!-- Pagination -->
    <div v-if="data?.hasMore" class="flex justify-center pt-6">
      <UButton variant="outline" label="Load more" @click="page++" />
    </div>
  </div>
</template>
