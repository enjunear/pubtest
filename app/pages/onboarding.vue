<script setup lang="ts">
definePageMeta({ auth: { only: 'user' } })

useSeoMeta({
  title: 'Welcome',
  robots: 'noindex',
})

const { user } = useAuth()
const loading = ref(false)
const ageConfirmed = ref(false)
const selectedElectorate = ref<number | null>(null)
const errorMessage = ref('')
const searchQuery = ref('')

const { data: electorates } = await useFetch('/api/electorates')

const filteredElectorates = computed(() => {
  if (!electorates.value) return []
  if (!searchQuery.value) return electorates.value
  const q = searchQuery.value.toLowerCase()
  return electorates.value.filter((e: { name: string, state: string }) =>
    e.name.toLowerCase().includes(q) || e.state.toLowerCase().includes(q),
  )
})

async function onSubmit() {
  if (!ageConfirmed.value) {
    errorMessage.value = 'You must confirm you are 18 or older.'
    return
  }
  if (!selectedElectorate.value) {
    errorMessage.value = 'Please select your electorate.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/onboarding', {
      method: 'POST',
      body: {
        electorateId: selectedElectorate.value,
      },
    })
    await navigateTo('/')
  }
  catch (err: any) {
    errorMessage.value = err.data?.message || 'Something went wrong.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex justify-center py-12">
    <div class="w-full max-w-md space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold">Welcome, {{ user?.name || 'mate' }}!</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">
          Just a couple of things before you get started.
        </p>
      </div>

      <UCard>
        <div class="space-y-6">
          <div>
            <UCheckbox
              v-model="ageConfirmed"
              label="I confirm I am 18 years of age or older and eligible to vote in Australian federal elections"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Your electorate</label>
            <UInput
              v-model="searchQuery"
              placeholder="Search electorates..."
              icon="i-heroicons-magnifying-glass"
              class="mb-2"
            />
            <div class="max-h-48 overflow-y-auto border rounded-md border-gray-200 dark:border-gray-700">
              <button
                v-for="electorate in filteredElectorates"
                :key="electorate.id"
                type="button"
                class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex justify-between items-center"
                :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedElectorate === electorate.id }"
                @click="selectedElectorate = electorate.id"
              >
                <span>{{ electorate.name }}</span>
                <span class="text-xs text-gray-400">{{ electorate.state }}</span>
              </button>
            </div>
            <p v-if="selectedElectorate" class="text-sm text-primary mt-1">
              Selected: {{ electorates?.find((e: any) => e.id === selectedElectorate)?.name }}
            </p>
          </div>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            :title="errorMessage"
          />

          <UButton
            block
            :loading="loading"
            :disabled="!ageConfirmed || !selectedElectorate"
            label="Get started"
            @click="onSubmit"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
