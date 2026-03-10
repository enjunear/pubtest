<script setup lang="ts">
const { loggedIn, user, signOut } = useAuth()
</script>

<template>
  <UApp>
    <UContainer>
      <header class="flex items-center justify-between py-4 border-b border-amber-200/60 dark:border-amber-800/40">
        <NuxtLink to="/" class="text-xl font-bold font-serif text-amber-800 dark:text-amber-400 tracking-tight">
          The Pub Test
        </NuxtLink>
        <nav class="flex items-center gap-4">
          <UButton to="/" variant="ghost" color="neutral" label="Feed" />
          <UButton to="/pollies" variant="ghost" color="neutral" label="Pollies" />
          <UButton to="/leaderboard" variant="ghost" color="neutral" label="Leaderboard" />
          <UButton to="/map" variant="ghost" color="neutral" label="Map" />
          <template v-if="loggedIn">
            <UButton to="/settings" variant="ghost" color="neutral" :label="user?.name || 'Account'" />
            <UButton variant="soft" label="Sign out" @click="signOut('/')" />
          </template>
          <UButton v-else to="/login" variant="soft" label="Sign in" />
        </nav>
      </header>

      <main class="py-6">
        <slot />
      </main>

      <footer class="py-4 border-t border-amber-200/60 dark:border-amber-800/40 text-sm text-stone-500">
        <div class="flex items-center justify-between">
          <span>The Pub Test</span>
          <div class="flex gap-4">
            <NuxtLink to="/terms" class="hover:text-amber-700 dark:hover:text-amber-400 hover:underline">Terms</NuxtLink>
            <NuxtLink to="/privacy" class="hover:text-amber-700 dark:hover:text-amber-400 hover:underline">Privacy</NuxtLink>
          </div>
        </div>
      </footer>
    </UContainer>
  </UApp>
</template>
