<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data, refresh } = await useFetch('/api/admin/sources')
const expandedSource = ref<number | null>(null)

// Add source form
const showAddSource = ref(false)
const newSource = reactive({ name: '', domain: '', tier: 3 })
const sourceLoading = ref(false)
const sourceError = ref('')

// Add feed form
const showAddFeed = ref<number | null>(null)
const newFeed = reactive({ feedUrl: '', category: '', pollIntervalMins: 15 })
const feedLoading = ref(false)

async function addSource() {
  sourceLoading.value = true
  sourceError.value = ''
  try {
    await $fetch('/api/admin/sources', { method: 'POST', body: { ...newSource } })
    showAddSource.value = false
    Object.assign(newSource, { name: '', domain: '', tier: 3 })
    await refresh()
  }
  catch (err: any) {
    sourceError.value = err.data?.message || 'Failed to add source'
  }
  finally {
    sourceLoading.value = false
  }
}

async function toggleSourceActive(id: number, isActive: boolean) {
  await $fetch(`/api/admin/sources/${id}`, { method: 'PUT', body: { isActive: !isActive } })
  await refresh()
}

async function updateSourceTier(id: number, tier: number) {
  await $fetch(`/api/admin/sources/${id}`, { method: 'PUT', body: { tier } })
  await refresh()
}

async function addFeed(sourceId: number) {
  feedLoading.value = true
  try {
    await $fetch('/api/admin/feeds', {
      method: 'POST',
      body: { sourceId, feedUrl: newFeed.feedUrl, category: newFeed.category || undefined, pollIntervalMins: newFeed.pollIntervalMins },
    })
    showAddFeed.value = null
    Object.assign(newFeed, { feedUrl: '', category: '', pollIntervalMins: 15 })
    await refresh()
  }
  catch (err: any) {
    alert(err.data?.message || 'Failed to add feed')
  }
  finally {
    feedLoading.value = false
  }
}

async function toggleFeedStatus(feedId: number, currentStatus: string) {
  const status = currentStatus === 'active' ? 'paused' : 'active'
  await $fetch(`/api/admin/feeds/${feedId}`, { method: 'PUT', body: { status } })
  await refresh()
}

async function deleteFeed(feedId: number) {
  if (!confirm('Delete this feed?')) return
  await $fetch(`/api/admin/feeds/${feedId}`, { method: 'DELETE' })
  await refresh()
}

const feedStatusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  paused: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
}

function formatDate(date: string | number | null) {
  if (!date) return 'Never'
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Sources & Feeds</h1>
      <UButton size="sm" icon="i-heroicons-plus" label="Add source" @click="showAddSource = true" />
    </div>

    <!-- Add source form -->
    <div v-if="showAddSource" class="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-500/30 p-5 mb-6">
      <h3 class="text-sm font-semibold mb-3">New Source</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <UInput v-model="newSource.name" placeholder="Source name" size="sm" />
        <UInput v-model="newSource.domain" placeholder="domain.com.au" size="sm" />
        <div class="flex gap-2">
          <select v-model.number="newSource.tier" class="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm">
            <option :value="1">Tier 1</option>
            <option :value="2">Tier 2</option>
            <option :value="3">Tier 3</option>
          </select>
          <UButton size="sm" label="Add" :loading="sourceLoading" @click="addSource" />
          <UButton size="sm" variant="ghost" label="Cancel" @click="showAddSource = false" />
        </div>
      </div>
      <p v-if="sourceError" class="text-xs text-red-500 mt-2">{{ sourceError }}</p>
    </div>

    <!-- Sources table -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-800 text-left">
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Domain</th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Feeds</th>
            <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="source in data?.sources" :key="source.id">
            <tr
              class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
              @click="expandedSource = expandedSource === source.id ? null : source.id"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="source.isActive ? 'bg-emerald-400' : 'bg-gray-400'" />
                  <span class="font-medium">{{ source.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500 hidden sm:table-cell font-mono text-xs">{{ source.domain }}</td>
              <td class="px-4 py-3">
                <select
                  :value="source.tier"
                  class="rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-0.5 text-xs"
                  @click.stop
                  @change="updateSourceTier(source.id, Number(($event.target as HTMLSelectElement).value))"
                >
                  <option :value="1">Tier 1</option>
                  <option :value="2">Tier 2</option>
                  <option :value="3">Tier 3</option>
                </select>
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-xs">{{ source.feeds.length }}</span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <UButton
                  size="xs"
                  :variant="source.isActive ? 'ghost' : 'soft'"
                  :color="source.isActive ? 'neutral' : 'success'"
                  :label="source.isActive ? 'Disable' : 'Enable'"
                  @click="toggleSourceActive(source.id, source.isActive)"
                />
              </td>
            </tr>

            <!-- Expanded feeds -->
            <tr v-if="expandedSource === source.id">
              <td colspan="5" class="bg-gray-50 dark:bg-gray-800/20 px-4 py-4">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">RSS Feeds</h4>
                  <UButton size="xs" variant="ghost" icon="i-heroicons-plus" label="Add feed" @click="showAddFeed = source.id" />
                </div>

                <!-- Add feed form -->
                <div v-if="showAddFeed === source.id" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3">
                  <div class="flex flex-wrap gap-2">
                    <UInput v-model="newFeed.feedUrl" placeholder="Feed URL" size="xs" class="flex-1 min-w-[200px]" />
                    <UInput v-model="newFeed.category" placeholder="Category (optional)" size="xs" class="w-36" />
                    <UButton size="xs" label="Add" :loading="feedLoading" @click="addFeed(source.id)" />
                    <UButton size="xs" variant="ghost" label="Cancel" @click="showAddFeed = null" />
                  </div>
                </div>

                <div v-if="source.feeds.length" class="space-y-1">
                  <div
                    v-for="feed in source.feeds"
                    :key="feed.id"
                    class="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-xs border border-gray-100 dark:border-gray-800"
                  >
                    <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium" :class="feedStatusStyles[feed.status]">
                      {{ feed.status }}
                    </span>
                    <span class="flex-1 font-mono text-gray-600 dark:text-gray-400 truncate">{{ feed.feedUrl }}</span>
                    <span v-if="feed.category" class="text-gray-400">{{ feed.category }}</span>
                    <span class="text-gray-400 whitespace-nowrap">Polled: {{ formatDate(feed.lastPolledAt) }}</span>
                    <span v-if="feed.errorCount" class="text-red-500">{{ feed.errorCount }} errors</span>
                    <div class="flex gap-1">
                      <UButton
                        size="xs"
                        variant="ghost"
                        :icon="feed.status === 'active' ? 'i-heroicons-pause' : 'i-heroicons-play'"
                        @click="toggleFeedStatus(feed.id, feed.status)"
                      />
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="error"
                        icon="i-heroicons-trash"
                        @click="deleteFeed(feed.id)"
                      />
                    </div>
                  </div>
                </div>
                <p v-else class="text-xs text-gray-400">No feeds configured.</p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="!data?.sources?.length" class="py-16 text-center text-gray-400 text-sm">
        No sources found.
      </div>
    </div>
  </div>
</template>
