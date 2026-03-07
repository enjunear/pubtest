<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const statusFilter = ref(useRoute().query.status as string || '')
const actionLoading = ref<number | null>(null)

const { data, refresh } = await useFetch('/api/admin/stories', {
  query: computed(() => ({
    status: statusFilter.value || undefined,
    limit: 100,
  })),
})

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'moderation' },
  { label: 'Active', value: 'active' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' },
]

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  moderation: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
}

async function updateStory(id: number, status: 'active' | 'rejected' | 'archived') {
  actionLoading.value = id
  try {
    await $fetch(`/api/admin/stories/${id}`, { method: 'PUT', body: { status } })
    await refresh()
  }
  catch (err: any) {
    alert(err.data?.message || 'Failed to update story')
  }
  finally {
    actionLoading.value = null
  }
}

function timeAgo(date: string | number | null) {
  if (!date) return '-'
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date)
  const diff = Date.now() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Stories</h1>
    </div>

    <!-- Status filter tabs -->
    <div class="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 w-fit">
      <button
        v-for="f in statusFilters"
        :key="f.value"
        class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
        :class="statusFilter === f.value
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        @click="statusFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Stories table -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800 text-left">
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Story</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Source</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Submitted</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="story in data?.stories"
              :key="story.id"
              class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
            >
              <td class="px-4 py-3 max-w-sm">
                <a :href="story.url" target="_blank" class="font-medium text-gray-900 dark:text-gray-100 hover:text-amber-600 dark:hover:text-amber-400 line-clamp-1 transition-colors">
                  {{ story.headline }}
                </a>
                <p class="text-xs text-gray-400 mt-0.5 truncate">{{ story.url }}</p>
              </td>
              <td class="px-4 py-3 hidden md:table-cell">
                <div class="text-gray-600 dark:text-gray-400">{{ story.sourceName || '-' }}</div>
                <div v-if="story.sourceTier" class="text-xs text-gray-400">Tier {{ story.sourceTier }}</div>
              </td>
              <td class="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                {{ timeAgo(story.submittedAt) }}
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" :class="statusStyles[story.status] || statusStyles.archived">
                  {{ story.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <UButton
                    v-if="story.status !== 'active'"
                    size="xs"
                    variant="ghost"
                    color="success"
                    icon="i-heroicons-check"
                    :loading="actionLoading === story.id"
                    @click="updateStory(story.id, 'active')"
                  />
                  <UButton
                    v-if="story.status !== 'rejected'"
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-heroicons-x-mark"
                    :loading="actionLoading === story.id"
                    @click="updateStory(story.id, 'rejected')"
                  />
                  <UButton
                    v-if="story.status !== 'archived'"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-archive-box"
                    :loading="actionLoading === story.id"
                    @click="updateStory(story.id, 'archived')"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!data?.stories?.length" class="py-16 text-center text-gray-400 text-sm">
        No stories found.
      </div>
    </div>
  </div>
</template>
