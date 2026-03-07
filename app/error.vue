<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode: number
    message: string
  }
}>()

useSeoMeta({
  title: () => `${props.error.statusCode} - ${props.error.message}`,
  robots: 'noindex',
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <UApp>
    <UContainer>
      <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <span class="text-6xl font-bold text-gray-300 dark:text-gray-600">
          {{ error.statusCode }}
        </span>
        <h1 class="text-xl font-semibold">
          {{ error.message || 'Something went wrong' }}
        </h1>
        <UButton label="Go home" variant="soft" @click="goHome" />
      </div>
    </UContainer>
  </UApp>
</template>
