<script setup lang="ts">
const route = useRoute()

const page = ref(1)

const { data, refresh } = await useFetch<{
  politician: {
    id: number
    name: string
    displayName: string
    party: string
    chamber: string
    electorateId: number | null
    state: string | null
    photoUrl: string | null
    status: string
    enteredParliament: string | null
    electorateName: string | null
  }
  stories: {
    id: number
    url: string
    headline: string
    description: string | null
    thumbnailUrl: string | null
    publishedAt: string | null
    submittedAt: string
    clusterId: number | null
    source: { name: string; domain: string } | null
    passCount: number
    failCount: number
    totalVotes: number
    politicians: { id: number; name: string; party: string; photoUrl: string | null }[]
  }[]
  page: number
  hasMore: boolean
}>(`/api/politicians/${route.params.id}`, {
  query: computed(() => ({ page: page.value, limit: 20 })),
})

if (!data.value?.politician) {
  throw createError({ statusCode: 404, message: 'Politician not found' })
}

const { data: approval } = await useFetch<{
  approvalPct: number | null
  passCount: number
  failCount: number
  totalVotes: number
}>(`/api/politicians/${route.params.id}/approval`)

const polly = computed(() => data.value!.politician)

const chamberLabel = computed(() =>
  polly.value.chamber === 'house' ? 'Member for' : 'Senator for',
)

const locationLabel = computed(() =>
  polly.value.chamber === 'house'
    ? polly.value.electorateName
    : polly.value.state,
)

const passPercent = computed(() => {
  if (!approval.value || approval.value.totalVotes === 0) return 50
  return approval.value.approvalPct ?? 50
})

const { getUserVote, getVoteCounts, castVote } = useVoting()

async function handleVote(clusterId: number, vote: 'pass' | 'fail') {
  const story = data.value?.stories?.find(s => s.clusterId === clusterId)
  if (!story) return
  const counts = getVoteCounts(clusterId, story.passCount, story.failCount)
  await castVote(clusterId, vote, counts.passCount, counts.failCount)
}

useHead({
  title: () => polly.value ? `${polly.value.name} - The Pub Test` : 'Politician',
})
</script>

<template>
  <div v-if="polly" class="max-w-3xl mx-auto space-y-6">
    <!-- Profile header -->
    <div class="flex items-start gap-6">
      <UAvatar
        v-if="polly.photoUrl"
        :src="polly.photoUrl"
        :alt="polly.name"
        size="3xl"
      />
      <div
        v-else
        class="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
      >
        <UIcon name="i-heroicons-user" class="text-3xl text-gray-400" />
      </div>

      <div class="flex-1">
        <h1 class="text-2xl font-bold">{{ polly.name }}</h1>
        <p class="text-gray-500 mt-1">{{ polly.party }}</p>
        <p class="text-sm text-gray-500">
          {{ chamberLabel }} {{ locationLabel }}
        </p>
        <p v-if="polly.enteredParliament" class="text-xs text-gray-400 mt-1">
          In parliament since {{ polly.enteredParliament }}
        </p>
      </div>
    </div>

    <!-- Approval rating -->
    <UCard>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Overall Approval</h2>
          <span v-if="approval && approval.totalVotes > 0" class="text-sm text-gray-500">
            {{ approval.totalVotes }} votes
          </span>
        </div>

        <div v-if="approval && approval.totalVotes > 0" class="space-y-2">
          <div class="text-center">
            <span
              class="text-4xl font-bold"
              :class="passPercent >= 50 ? 'text-green-600' : 'text-red-600'"
            >
              {{ passPercent }}%
            </span>
            <span class="text-sm text-gray-500 ml-1">approval</span>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-green-600 text-sm font-medium">Pass {{ passPercent }}%</span>
            <div class="flex-1 h-3 bg-red-200 dark:bg-red-900/40 rounded-full overflow-hidden">
              <div
                class="h-full bg-green-500 rounded-full transition-all"
                :style="{ width: `${passPercent}%` }"
              />
            </div>
            <span class="text-red-600 text-sm font-medium">{{ 100 - passPercent }}% Fail</span>
          </div>
        </div>

        <p v-else class="text-gray-400 text-sm text-center py-2">
          No votes yet for this politician.
        </p>
      </div>
    </UCard>

    <!-- Linked stories -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">Related Stories</h2>

      <div v-if="data?.stories?.length" class="space-y-4">
        <StoryCard
          v-for="story in data.stories"
          :key="story.id"
          :story="story"
          :user-vote="getUserVote(story.clusterId)"
          :vote-counts="story.clusterId ? getVoteCounts(story.clusterId, story.passCount, story.failCount) : null"
          @vote="handleVote"
        />

        <div v-if="data.hasMore" class="flex justify-center pt-4">
          <UButton variant="outline" label="Load more stories" @click="page++" />
        </div>
      </div>

      <p v-else class="text-gray-400 text-sm">No stories linked to this politician yet.</p>
    </div>
  </div>
</template>
