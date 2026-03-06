<template>
  <UApp>
    <UContainer>
      <header class="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-800">
        <NuxtLink to="/" class="text-xl font-bold">
          The Pub Test
        </NuxtLink>
        <nav class="flex items-center gap-4">
          <UButton to="/" variant="ghost" label="Feed" />
          <UButton to="/pollies" variant="ghost" label="Pollies" />
          <UButton to="/leaderboard" variant="ghost" label="Leaderboard" />
          <UButton to="/login" variant="soft" label="Login" />
        </nav>
      </header>

      <main class="py-6">
        <slot />
      </main>

      <footer class="py-4 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500">
        <div class="flex items-center justify-between">
          <span>The Pub Test</span>
          <div class="flex gap-4">
            <NuxtLink to="/terms" class="hover:underline">Terms</NuxtLink>
            <NuxtLink to="/privacy" class="hover:underline">Privacy</NuxtLink>
          </div>
        </div>
      </footer>
    </UContainer>
  </UApp>
</template>
