<script setup lang="ts">
const route = useRoute()

const { data: story } = await useFetch<{
  id: number
  url: string
  headline: string
  description: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
  submittedAt: string
  clusterId: number | null
  source: { name: string, domain: string } | null
  politicians: { id: number, name: string, party: string, chamber: string, state: string | null, photoUrl: string | null }[]
  passCount: number
  failCount: number
  totalVotes: number
}>(`/api/stories/${route.params.id}`)

if (!story.value) {
  throw createError({ statusCode: 404, message: 'Story not found' })
}

useSeoMeta({
  title: () => story.value?.headline ?? 'Story',
  ogTitle: () => story.value ? `${story.value.headline} - The Pub Test` : 'Story',
  description: () => story.value?.description ?? '',
  ogDescription: () => story.value?.description ?? '',
  ogImage: () => story.value?.thumbnailUrl ?? undefined,
})

const { getUserVote, getVoteCounts, castVote } = useVoting()

const currentVote = computed(() => getUserVote(story.value?.clusterId ?? null))

const counts = computed(() => {
  if (!story.value) return { passCount: 0, failCount: 0, totalVotes: 0 }
  return getVoteCounts(story.value.clusterId, story.value.passCount, story.value.failCount)
})

const passPercent = computed(() => {
  if (counts.value.totalVotes === 0) return 50
  return Math.round((counts.value.passCount / counts.value.totalVotes) * 100)
})

async function handleVote(vote: 'pass' | 'fail') {
  if (!story.value?.clusterId) return
  await castVote(story.value.clusterId, vote, counts.value.passCount, counts.value.failCount)
}
</script>

<template>
  <div v-if="story" class="max-w-2xl mx-auto py-8 space-y-6">
    <!-- Thumbnail -->
    <img
      v-if="story.thumbnailUrl"
      :src="story.thumbnailUrl"
      :alt="story.headline"
      class="w-full h-64 object-cover rounded-lg"
    >

    <!-- Headline -->
    <h1 class="text-2xl font-bold leading-tight">{{ story.headline }}</h1>

    <!-- Meta -->
    <div class="flex items-center gap-3 text-sm text-gray-500">
      <span v-if="story.source">{{ story.source.name }}</span>
      <span v-if="story.publishedAt">
        {{ new Date(story.publishedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) }}
      </span>
      <a :href="story.url" target="_blank" rel="noopener" class="text-primary hover:underline">
        Read article
      </a>
    </div>

    <!-- Description -->
    <p v-if="story.description" class="text-gray-600 dark:text-gray-400">
      {{ story.description }}
    </p>

    <!-- Politicians -->
    <div v-if="story.politicians?.length" class="space-y-2">
      <h2 class="text-sm font-semibold text-gray-500 uppercase">Linked Politicians</h2>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          v-for="polly in story.politicians"
          :key="polly.id"
          :to="`/polly/${polly.id}`"
          class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <UAvatar
            v-if="polly.photoUrl"
            :src="polly.photoUrl"
            :alt="polly.name"
            size="sm"
          />
          <div>
            <div class="text-sm font-medium">{{ polly.name }}</div>
            <div class="text-xs text-gray-500">{{ polly.party }}</div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Voting -->
    <UCard>
      <div class="space-y-4">
        <h2 class="font-semibold">Does it pass the pub test?</h2>

        <!-- Vote bar -->
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
        <p class="text-xs text-gray-500 text-center">{{ counts.totalVotes }} votes</p>

        <!-- Vote buttons -->
        <div class="flex gap-3">
          <UButton
            class="flex-1"
            size="lg"
            :variant="currentVote === 'pass' ? 'solid' : 'outline'"
            color="success"
            icon="i-heroicons-hand-thumb-up"
            label="Passes"
            @click="handleVote('pass')"
          />
          <UButton
            class="flex-1"
            size="lg"
            :variant="currentVote === 'fail' ? 'solid' : 'outline'"
            color="error"
            icon="i-heroicons-hand-thumb-down"
            label="Fails"
            @click="handleVote('fail')"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
