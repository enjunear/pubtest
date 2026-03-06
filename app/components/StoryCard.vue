<script setup lang="ts">
interface Politician {
  id: number
  name: string
  party: string
  photoUrl: string | null
}

interface Story {
  id: number
  url: string
  headline: string
  description?: string | null
  thumbnailUrl?: string | null
  publishedAt?: string | null
  submittedAt: string
  clusterId: number | null
  source: { name: string | null, domain: string | null } | null
  passCount: number
  failCount: number
  totalVotes: number
  politicians: Politician[]
}

const props = defineProps<{
  story: Story
  userVote?: 'pass' | 'fail' | null
  voteCounts?: { passCount: number, failCount: number, totalVotes: number } | null
}>()

const emit = defineEmits<{
  vote: [clusterId: number, vote: 'pass' | 'fail']
}>()

const effectivePass = computed(() => props.voteCounts?.passCount ?? props.story.passCount)
const effectiveFail = computed(() => props.voteCounts?.failCount ?? props.story.failCount)
const effectiveTotal = computed(() => props.voteCounts?.totalVotes ?? props.story.totalVotes)

const passPercent = computed(() => {
  if (effectiveTotal.value === 0) return 50
  return Math.round((effectivePass.value / effectiveTotal.value) * 100)
})

const timeAgo = computed(() => {
  const date = props.story.publishedAt || props.story.submittedAt
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
})
</script>

<template>
  <UCard class="hover:ring-1 hover:ring-primary/30 transition-all">
    <div class="flex gap-4">
      <!-- Thumbnail -->
      <div v-if="story.thumbnailUrl" class="flex-shrink-0 hidden sm:block">
        <img
          :src="story.thumbnailUrl"
          :alt="story.headline"
          class="w-24 h-24 object-cover rounded"
          loading="lazy"
        >
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <!-- Headline -->
        <NuxtLink :to="`/story/${story.id}`" class="block">
          <h3 class="font-semibold text-base leading-snug line-clamp-2 hover:text-primary transition-colors">
            {{ story.headline }}
          </h3>
        </NuxtLink>

        <!-- Meta -->
        <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span v-if="story.source">{{ story.source.name }}</span>
          <span>{{ timeAgo }}</span>
        </div>

        <!-- Politicians -->
        <div v-if="story.politicians.length" class="flex items-center gap-2 mt-2 flex-wrap">
          <NuxtLink
            v-for="polly in story.politicians"
            :key="polly.id"
            :to="`/polly/${polly.id}`"
            class="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <UAvatar
              v-if="polly.photoUrl"
              :src="polly.photoUrl"
              :alt="polly.name"
              size="2xs"
            />
            <span>{{ polly.name }}</span>
            <span class="text-gray-400">({{ polly.party }})</span>
          </NuxtLink>
        </div>

        <!-- Vote bar + buttons -->
        <div class="flex items-center gap-3 mt-3">
          <!-- Pass/Fail bar -->
          <div class="flex-1 h-2 bg-red-200 dark:bg-red-900/40 rounded-full overflow-hidden">
            <div
              class="h-full bg-green-500 rounded-full transition-all"
              :style="{ width: `${passPercent}%` }"
            />
          </div>
          <span class="text-xs text-gray-500 w-16 text-right">
            {{ effectiveTotal > 0 ? `${passPercent}% (${effectiveTotal})` : 'No votes' }}
          </span>

          <!-- Vote buttons -->
          <div class="flex gap-1">
            <UButton
              size="xs"
              :variant="userVote === 'pass' ? 'solid' : 'outline'"
              color="success"
              icon="i-heroicons-hand-thumb-up"
              @click="story.clusterId && emit('vote', story.clusterId, 'pass')"
            />
            <UButton
              size="xs"
              :variant="userVote === 'fail' ? 'solid' : 'outline'"
              color="error"
              icon="i-heroicons-hand-thumb-down"
              @click="story.clusterId && emit('vote', story.clusterId, 'fail')"
            />
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
