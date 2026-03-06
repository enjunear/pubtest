<script setup lang="ts">
definePageMeta({ auth: { only: 'user' } })

const urlInput = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successId = ref<number | null>(null)

async function handleSubmit() {
  if (!urlInput.value.trim()) return
  loading.value = true
  errorMessage.value = ''
  successId.value = null

  try {
    const result = await $fetch('/api/stories/submit', {
      method: 'POST',
      body: { url: urlInput.value.trim() },
    })
    successId.value = result.storyId
    urlInput.value = ''
  }
  catch (err: any) {
    errorMessage.value = err.data?.message || 'Failed to submit story'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto py-8 space-y-6">
    <h1 class="text-2xl font-bold">Submit a Story</h1>
    <p class="text-gray-500 dark:text-gray-400">
      Paste a link to a news article about an Australian federal politician.
      We'll fetch the details and link it to the right pollies automatically.
    </p>

    <UCard>
      <div class="space-y-4">
        <UInput
          v-model="urlInput"
          placeholder="https://..."
          icon="i-heroicons-link"
          size="lg"
          :disabled="loading"
          @keydown.enter="handleSubmit"
        />

        <UButton
          block
          :loading="loading"
          :disabled="!urlInput.trim()"
          label="Submit"
          @click="handleSubmit"
        />
      </div>
    </UCard>

    <UAlert
      v-if="successId"
      color="success"
      variant="subtle"
      title="Story submitted!"
    >
      <template #description>
        <NuxtLink :to="`/story/${successId}`" class="underline">View story</NuxtLink>
      </template>
    </UAlert>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      :title="errorMessage"
    />
  </div>
</template>
