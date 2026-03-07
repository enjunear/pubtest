<script setup lang="ts">
definePageMeta({ auth: { only: 'user' } })

useSeoMeta({
  title: 'Settings',
  robots: 'noindex',
})

const { user, signOut } = useAuth()
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const searchQuery = ref('')
const showDeleteConfirm = ref(false)

const { data: profile, refresh: refreshProfile } = await useFetch('/api/me')
const { data: electorates } = await useFetch('/api/electorates')
const selectedElectorate = ref(profile.value?.profile?.electorateId ?? null)

const filteredElectorates = computed(() => {
  if (!electorates.value) return []
  if (!searchQuery.value) return electorates.value
  const q = searchQuery.value.toLowerCase()
  return electorates.value.filter((e: { name: string, state: string }) =>
    e.name.toLowerCase().includes(q) || e.state.toLowerCase().includes(q),
  )
})

const currentElectorate = computed(() =>
  electorates.value?.find((e: any) => e.id === selectedElectorate.value),
)

async function updateElectorate() {
  if (!selectedElectorate.value) return
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch('/api/settings/electorate', {
      method: 'PUT',
      body: { electorateId: selectedElectorate.value },
    })
    successMessage.value = 'Electorate updated.'
    await refreshProfile()
  }
  catch (err: any) {
    errorMessage.value = err.data?.message || 'Failed to update.'
  }
  finally {
    loading.value = false
  }
}

async function deleteAccount() {
  loading.value = true
  try {
    await $fetch('/api/settings/account', { method: 'DELETE' })
    await signOut('/')
  }
  catch (err: any) {
    errorMessage.value = err.data?.message || 'Failed to delete account.'
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto py-8 space-y-6">
    <h1 class="text-2xl font-bold">Settings</h1>

    <UCard>
      <template #header>
        <h2 class="font-semibold">Account</h2>
      </template>
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-gray-500">Name</dt>
          <dd>{{ user?.name }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">Email</dt>
          <dd>{{ user?.email }}</dd>
        </div>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-semibold">Electorate</h2>
      </template>
      <div class="space-y-3">
        <p v-if="currentElectorate" class="text-sm">
          Current: <strong>{{ currentElectorate.name }}</strong> ({{ currentElectorate.state }})
        </p>
        <UInput
          v-model="searchQuery"
          placeholder="Search electorates..."
          icon="i-heroicons-magnifying-glass"
          size="sm"
        />
        <div class="max-h-40 overflow-y-auto border rounded-md border-gray-200 dark:border-gray-700">
          <button
            v-for="electorate in filteredElectorates"
            :key="electorate.id"
            type="button"
            class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex justify-between"
            :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedElectorate === electorate.id }"
            @click="selectedElectorate = electorate.id"
          >
            <span>{{ electorate.name }}</span>
            <span class="text-xs text-gray-400">{{ electorate.state }}</span>
          </button>
        </div>
        <UButton
          :loading="loading"
          :disabled="selectedElectorate === profile?.profile?.electorateId"
          label="Update electorate"
          @click="updateElectorate"
        />
      </div>
    </UCard>

    <UAlert
      v-if="successMessage"
      color="success"
      variant="subtle"
      :title="successMessage"
    />
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      :title="errorMessage"
    />

    <UCard>
      <template #header>
        <h2 class="font-semibold text-red-600">Danger Zone</h2>
      </template>
      <div v-if="!showDeleteConfirm">
        <UButton
          color="error"
          variant="outline"
          label="Delete my account"
          @click="showDeleteConfirm = true"
        />
      </div>
      <div v-else class="space-y-3">
        <p class="text-sm text-gray-500">
          This will permanently delete your account. Your votes will be anonymised and retained.
        </p>
        <div class="flex gap-2">
          <UButton
            color="error"
            :loading="loading"
            label="Yes, delete my account"
            @click="deleteAccount"
          />
          <UButton
            variant="ghost"
            label="Cancel"
            @click="showDeleteConfirm = false"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
