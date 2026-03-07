<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const searchQuery = ref('')
const statusFilter = ref('')
const page = ref(1)
const actionLoading = ref<string | null>(null)

const { data, refresh } = await useFetch('/api/admin/users', {
  query: computed(() => ({
    search: searchQuery.value || undefined,
    status: statusFilter.value || undefined,
    page: page.value,
    limit: 50,
  })),
})

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  banned: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
}

async function updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned') {
  const action = status === 'banned' ? 'ban' : status === 'suspended' ? 'suspend' : 'reactivate'
  if (!confirm(`Are you sure you want to ${action} this user?`)) return

  actionLoading.value = userId
  try {
    await $fetch(`/api/admin/users/${userId}`, { method: 'PUT', body: { status } })
    await refresh()
  }
  catch (err: any) {
    alert(err.data?.message || 'Failed to update user')
  }
  finally {
    actionLoading.value = null
  }
}

function formatDate(date: string | number | null) {
  if (!date) return '-'
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Users</h1>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 mb-4">
      <UInput
        v-model="searchQuery"
        placeholder="Search by name or email..."
        icon="i-heroicons-magnifying-glass"
        size="sm"
        class="w-72"
      />
      <select
        v-model="statusFilter"
        class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="banned">Banned</option>
      </select>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800 text-left">
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Electorate</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Votes</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in data?.users"
              :key="u.id"
              class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
            >
              <td class="px-4 py-3">
                <div class="font-medium">
                  {{ u.name }}
                  <span v-if="u.isAdmin" class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-semibold uppercase">Admin</span>
                </div>
                <div class="text-xs text-gray-400">{{ u.email }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                <template v-if="u.electorateName">{{ u.electorateName }} ({{ u.electorateState }})</template>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                {{ formatDate(u.createdAt) }}
              </td>
              <td class="px-4 py-3 font-mono text-xs">
                {{ u.voteCount }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="statusStyles[u.status || 'active']"
                >
                  {{ u.status || 'active' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <UButton
                    v-if="u.status !== 'suspended' && u.status !== 'banned'"
                    size="xs"
                    variant="ghost"
                    color="warning"
                    label="Suspend"
                    :loading="actionLoading === u.id"
                    @click="updateUserStatus(u.id, 'suspended')"
                  />
                  <UButton
                    v-if="u.status !== 'banned'"
                    size="xs"
                    variant="ghost"
                    color="error"
                    label="Ban"
                    :loading="actionLoading === u.id"
                    @click="updateUserStatus(u.id, 'banned')"
                  />
                  <UButton
                    v-if="u.status === 'suspended' || u.status === 'banned'"
                    size="xs"
                    variant="ghost"
                    color="success"
                    label="Activate"
                    :loading="actionLoading === u.id"
                    @click="updateUserStatus(u.id, 'active')"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!data?.users?.length" class="py-16 text-center text-gray-400 text-sm">
        No users found.
      </div>
    </div>
  </div>
</template>
