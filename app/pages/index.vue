<script setup lang="ts">
const { loggedIn } = useAuth()
const sort = ref('new')
const page = ref(1)

const { data, refresh } = await useFetch('/api/stories', {
  query: computed(() => ({
    sort: sort.value,
    page: page.value,
    limit: 20,
  })),
})

// Fetch user's votes if logged in
const { data: userVotes, refresh: refreshVotes } = await useFetch('/api/votes/mine', {
  default: () => ({} as Record<number, 'pass' | 'fail'>),
})

async function handleVote(clusterId: number, vote: 'pass' | 'fail') {
  if (!loggedIn.value) {
    await navigateTo('/login')
    return
  }
  try {
    await $fetch('/api/votes', {
      method: 'POST',
      body: { clusterId, vote },
    })
    await Promise.all([refresh(), refreshVotes()])
  }
  catch (err: any) {
    console.error('Vote failed:', err)
  }
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
        :user-vote="story.clusterId ? (userVotes?.[story.clusterId] as 'pass' | 'fail' | undefined) || null : null"
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
