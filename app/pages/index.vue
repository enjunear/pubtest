<script setup lang="ts">
useSeoMeta({
  title: 'The Pub Test',
  titleTemplate: '',
  description: 'Hold Australian politicians accountable. Vote on whether their actions pass the pub test.',
  ogTitle: 'The Pub Test',
  ogDescription: 'Hold Australian politicians accountable. Vote on whether their actions pass the pub test.',
})

const sort = ref('new')
const page = ref(1)

const { data, refresh } = await useFetch('/api/stories', {
  query: computed(() => ({
    sort: sort.value,
    page: page.value,
    limit: 20,
  })),
})

const { getUserVote, getVoteCounts, castVote } = useVoting()

async function handleVote(clusterId: number, vote: 'pass' | 'fail') {
  const story = data.value?.stories?.find(s => s.clusterId === clusterId)
  if (!story) return
  const counts = getVoteCounts(clusterId, story.passCount, story.failCount)
  await castVote(clusterId, vote, counts.passCount, counts.failCount)
}

const sortOptions = [
  { label: 'New', value: 'new' },
  { label: 'Hot', value: 'hot' },
  { label: 'Most Voted', value: 'most-voted' },
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">The Pub Test</h1>
      <div class="flex items-center gap-2">
        <UButtonGroup>
          <UButton
            v-for="opt in sortOptions"
            :key="opt.value"
            size="sm"
            :variant="sort === opt.value ? 'solid' : 'outline'"
            :label="opt.label"
            @click="sort = opt.value; page = 1"
          />
        </UButtonGroup>
      </div>
    </div>

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
        <UButton
          variant="outline"
          label="Load more"
          @click="page++"
        />
      </div>
    </div>

    <div v-else class="text-center py-16">
      <UIcon name="i-heroicons-newspaper" class="text-5xl text-gray-300 dark:text-gray-600" />
      <p class="mt-4 text-gray-500">No stories yet. Check back soon.</p>
    </div>
  </div>
</template>
