<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data, refresh } = await useFetch('/api/admin/politicians')
const searchQuery = ref('')
const partyFilter = ref('')
const chamberFilter = ref('')

const parties = computed(() => {
  if (!data.value?.politicians) return []
  return [...new Set(data.value.politicians.map(p => p.party))].sort()
})

const filtered = computed(() => {
  if (!data.value?.politicians) return []
  return data.value.politicians.filter((p) => {
    if (searchQuery.value && !p.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
    if (partyFilter.value && p.party !== partyFilter.value) return false
    if (chamberFilter.value && p.chamber !== chamberFilter.value) return false
    return true
  })
})

// Edit state
const editing = ref<number | null>(null)
const editForm = reactive({
  name: '',
  displayName: '',
  party: '',
  chamber: '' as 'house' | 'senate',
  state: '',
  photoUrl: '',
  status: '' as 'current' | 'former',
})
const editLoading = ref(false)

function startEdit(p: any) {
  editing.value = p.id
  Object.assign(editForm, {
    name: p.name,
    displayName: p.displayName,
    party: p.party,
    chamber: p.chamber,
    state: p.state || '',
    photoUrl: p.photoUrl || '',
    status: p.status,
  })
}

async function saveEdit() {
  if (!editing.value) return
  editLoading.value = true
  try {
    await $fetch(`/api/admin/politicians/${editing.value}`, { method: 'PUT', body: { ...editForm } })
    editing.value = null
    await refresh()
  }
  catch (err: any) {
    alert(err.data?.message || 'Failed to update')
  }
  finally {
    editLoading.value = false
  }
}

// Add state
const showAdd = ref(false)
const addForm = reactive({
  name: '',
  displayName: '',
  party: '',
  chamber: 'house' as 'house' | 'senate',
  state: '',
  photoUrl: '',
})
const addLoading = ref(false)

async function addPolitician() {
  addLoading.value = true
  try {
    await $fetch('/api/admin/politicians', { method: 'POST', body: { ...addForm } })
    showAdd.value = false
    Object.assign(addForm, { name: '', displayName: '', party: '', chamber: 'house', state: '', photoUrl: '' })
    await refresh()
  }
  catch (err: any) {
    alert(err.data?.message || 'Failed to add politician')
  }
  finally {
    addLoading.value = false
  }
}

const statusStyles: Record<string, string> = {
  current: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  former: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Politicians</h1>
      <UButton size="sm" icon="i-heroicons-plus" label="Add politician" @click="showAdd = true" />
    </div>

    <!-- Add form -->
    <div v-if="showAdd" class="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-500/30 p-5 mb-6">
      <h3 class="text-sm font-semibold mb-3">New Politician</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <UInput v-model="addForm.name" placeholder="Full name" size="sm" />
        <UInput v-model="addForm.displayName" placeholder="Display name" size="sm" />
        <UInput v-model="addForm.party" placeholder="Party" size="sm" />
        <select v-model="addForm.chamber" class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm">
          <option value="house">House</option>
          <option value="senate">Senate</option>
        </select>
        <UInput v-model="addForm.state" placeholder="State (e.g. NSW)" size="sm" />
        <UInput v-model="addForm.photoUrl" placeholder="Photo URL (optional)" size="sm" />
      </div>
      <div class="flex gap-2 mt-3">
        <UButton size="sm" label="Add" :loading="addLoading" @click="addPolitician" />
        <UButton size="sm" variant="ghost" label="Cancel" @click="showAdd = false" />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 mb-4">
      <UInput v-model="searchQuery" placeholder="Search by name..." icon="i-heroicons-magnifying-glass" size="sm" class="w-64" />
      <select
        v-model="partyFilter"
        class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
      >
        <option value="">All parties</option>
        <option v-for="party in parties" :key="party" :value="party">{{ party }}</option>
      </select>
      <select
        v-model="chamberFilter"
        class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
      >
        <option value="">All chambers</option>
        <option value="house">House</option>
        <option value="senate">Senate</option>
      </select>
      <span class="text-xs text-gray-400 self-center ml-1">{{ filtered.length }} results</span>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800 text-left">
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Party</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Chamber</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Electorate / State</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="p in filtered" :key="p.id">
              <tr class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <UAvatar v-if="p.photoUrl" :src="p.photoUrl" :alt="p.name" size="xs" />
                    <div>
                      <div class="font-medium">{{ p.displayName }}</div>
                      <div v-if="p.displayName !== p.name" class="text-xs text-gray-400">{{ p.name }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{{ p.party }}</td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize hidden md:table-cell">{{ p.chamber }}</td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                  {{ p.electorateName || p.state || '-' }}
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" :class="statusStyles[p.status]">
                    {{ p.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <UButton size="xs" variant="ghost" icon="i-heroicons-pencil" @click="startEdit(p)" />
                </td>
              </tr>

              <!-- Inline edit row -->
              <tr v-if="editing === p.id">
                <td colspan="6" class="bg-gray-50 dark:bg-gray-800/20 px-4 py-4">
                  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <UInput v-model="editForm.name" placeholder="Full name" size="sm" />
                    <UInput v-model="editForm.displayName" placeholder="Display name" size="sm" />
                    <UInput v-model="editForm.party" placeholder="Party" size="sm" />
                    <select v-model="editForm.chamber" class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm">
                      <option value="house">House</option>
                      <option value="senate">Senate</option>
                    </select>
                    <UInput v-model="editForm.state" placeholder="State" size="sm" />
                    <UInput v-model="editForm.photoUrl" placeholder="Photo URL" size="sm" />
                    <select v-model="editForm.status" class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm">
                      <option value="current">Current</option>
                      <option value="former">Former</option>
                    </select>
                    <div class="flex items-center gap-2">
                      <UButton size="sm" label="Save" :loading="editLoading" @click="saveEdit" />
                      <UButton size="sm" variant="ghost" label="Cancel" @click="editing = null" />
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="!filtered.length" class="py-16 text-center text-gray-400 text-sm">
        No politicians found.
      </div>
    </div>
  </div>
</template>
