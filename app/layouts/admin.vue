<script setup lang="ts">
const route = useRoute()
const sidebarOpen = ref(false)

const navItems = [
  { to: '/admin', icon: 'i-heroicons-squares-2x2', label: 'Dashboard', exact: true },
  { to: '/admin/stories', icon: 'i-heroicons-newspaper', label: 'Stories' },
  { to: '/admin/sources', icon: 'i-heroicons-rss', label: 'Sources' },
  { to: '/admin/politicians', icon: 'i-heroicons-user-group', label: 'Politicians' },
  { to: '/admin/users', icon: 'i-heroicons-users', label: 'Users' },
]

function isActive(item: typeof navItems[0]) {
  if (item.exact) return route.path === item.to
  return route.path.startsWith(item.to)
}

watch(() => route.path, () => { sidebarOpen.value = false })
</script>

<template>
  <UApp>
    <div class="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <!-- Desktop sidebar -->
      <aside class="hidden lg:flex lg:flex-col lg:w-60 bg-gray-950 border-r border-gray-800/50 fixed inset-y-0 left-0 z-30">
        <div class="px-5 py-5 border-b border-gray-800/50">
          <NuxtLink to="/admin" class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-md bg-amber-500/15 text-amber-400 text-sm font-bold">P</span>
            <span class="text-[15px] font-semibold text-white tracking-tight">Admin Panel</span>
          </NuxtLink>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-0.5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150"
            :class="isActive(item)
              ? 'bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/5'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'"
          >
            <UIcon :name="item.icon" class="text-[17px] shrink-0" />
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="px-3 py-4 border-t border-gray-800/50">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all duration-150"
          >
            <UIcon name="i-heroicons-arrow-left" class="text-[17px]" />
            Back to site
          </NuxtLink>
        </div>
      </aside>

      <!-- Mobile header -->
      <div class="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-950 border-b border-gray-800/50 px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/admin" class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/15 text-amber-400 text-xs font-bold">P</span>
          <span class="text-sm font-semibold text-white">Admin</span>
        </NuxtLink>
        <button class="text-gray-400 p-1" @click="sidebarOpen = !sidebarOpen">
          <UIcon :name="sidebarOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="text-xl" />
        </button>
      </div>

      <!-- Mobile sidebar backdrop -->
      <Transition enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-to-class="opacity-0">
        <div v-if="sidebarOpen" class="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" @click="sidebarOpen = false" />
      </Transition>

      <!-- Mobile sidebar -->
      <Transition enter-active-class="transition-transform duration-200" leave-active-class="transition-transform duration-200" enter-from-class="-translate-x-full" leave-to-class="-translate-x-full">
        <aside v-if="sidebarOpen" class="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-60 bg-gray-950 pt-16 border-r border-gray-800/50">
          <nav class="px-3 py-4 space-y-0.5">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150"
              :class="isActive(item)
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'"
            >
              <UIcon :name="item.icon" class="text-[17px]" />
              {{ item.label }}
            </NuxtLink>
          </nav>
          <div class="px-3 py-4 border-t border-gray-800/50">
            <NuxtLink
              to="/"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all"
            >
              <UIcon name="i-heroicons-arrow-left" class="text-[17px]" />
              Back to site
            </NuxtLink>
          </div>
        </aside>
      </Transition>

      <!-- Main content -->
      <main class="flex-1 lg:ml-60 min-h-screen">
        <div class="px-6 py-6 lg:px-10 lg:py-8 pt-20 lg:pt-8 max-w-[1400px]">
          <slot />
        </div>
      </main>
    </div>
  </UApp>
</template>
