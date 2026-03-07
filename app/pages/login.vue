<script setup lang="ts">
definePageMeta({ auth: { only: 'guest' } })

useSeoMeta({
  title: 'Sign In',
  description: 'Sign in to The Pub Test to vote on whether politicians pass the pub test.',
  ogTitle: 'Sign In - The Pub Test',
  ogDescription: 'Sign in to The Pub Test to vote on whether politicians pass the pub test.',
})

const { client } = useAuth()
const loading = ref(false)
const magicLinkSent = ref(false)
const errorMessage = ref('')
const turnstileToken = ref('')

const providers = [
  {
    label: 'Continue with Google',
    icon: 'i-simple-icons-google',
    color: 'neutral' as const,
    variant: 'outline' as const,
    block: true,
    onClick: () => {
      client.signIn.social({ provider: 'google', callbackURL: '/' })
    },
  },
]

const fields = [
  {
    name: 'email',
    type: 'email' as const,
    label: 'Email',
    placeholder: 'you@example.com',
    required: true,
  },
]

async function onSubmit(payload: { data: { email: string } }) {
  if (!turnstileToken.value) {
    errorMessage.value = 'Please complete the verification.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  const { error } = await client.signIn.magicLink({
    email: payload.data.email,
    callbackURL: '/',
    fetchOptions: {
      headers: { 'x-turnstile-token': turnstileToken.value },
    },
  })
  loading.value = false
  if (error) {
    errorMessage.value = error.message || 'Something went wrong. Please try again.'
  }
  else {
    magicLinkSent.value = true
  }
}
</script>

<template>
  <div class="flex justify-center py-12">
    <div class="w-full max-w-sm">
      <div v-if="magicLinkSent" class="text-center space-y-4">
        <UIcon name="i-heroicons-envelope" class="text-4xl text-primary" />
        <h2 class="text-xl font-semibold">Check your email</h2>
        <p class="text-gray-500 dark:text-gray-400">
          We've sent a sign-in link to your email. Click it to log in.
        </p>
        <UButton
          variant="ghost"
          label="Try again"
          @click="magicLinkSent = false"
        />
      </div>

      <template v-else>
        <UAuthForm
          title="Sign in to The Pub Test"
          description="Sign in with your Google account or email"
          :providers="providers"
          :fields="fields"
          :loading="loading"
          :submit="{ label: 'Send magic link' }"
          @submit="onSubmit"
        />
        <div class="mt-4 flex justify-center">
          <NuxtTurnstile v-model="turnstileToken" />
        </div>
      </template>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        :title="errorMessage"
        class="mt-4"
      />
    </div>
  </div>
</template>
