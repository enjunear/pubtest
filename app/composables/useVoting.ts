interface VoteState {
  [clusterId: number]: 'pass' | 'fail'
}

interface VoteCountOverride {
  passCount: number
  failCount: number
  totalVotes: number
}

export function useVoting() {
  const { loggedIn } = useAuth()
  const toast = useToast()

  // Server-fetched votes
  const { data: serverVotes, refresh: refreshVotes } = useFetch('/api/votes/mine', {
    default: () => ({} as VoteState),
  })

  // Optimistic overrides (clusterId -> vote or null for removed)
  const optimisticVotes = ref<Record<number, 'pass' | 'fail' | null>>({})
  const optimisticCounts = ref<Record<number, VoteCountOverride>>({})
  const voting = ref(false)

  function getUserVote(clusterId: number | null): 'pass' | 'fail' | null {
    if (!clusterId) return null
    if (clusterId in optimisticVotes.value) {
      return optimisticVotes.value[clusterId]
    }
    return (serverVotes.value as VoteState)?.[clusterId] || null
  }

  function getVoteCounts(clusterId: number | null, serverPass: number, serverFail: number): VoteCountOverride {
    if (clusterId && clusterId in optimisticCounts.value) {
      return optimisticCounts.value[clusterId]
    }
    return { passCount: serverPass, failCount: serverFail, totalVotes: serverPass + serverFail }
  }

  async function castVote(
    clusterId: number,
    vote: 'pass' | 'fail',
    currentPassCount: number,
    currentFailCount: number,
  ) {
    if (!loggedIn.value) {
      await navigateTo('/login')
      return
    }
    if (voting.value) return
    voting.value = true

    const previousVote = getUserVote(clusterId)
    let newPass = currentPassCount
    let newFail = currentFailCount

    // Calculate optimistic counts
    if (previousVote === vote) {
      // Toggle off
      optimisticVotes.value[clusterId] = null
      if (vote === 'pass') newPass--
      else newFail--
    } else {
      optimisticVotes.value[clusterId] = vote
      if (previousVote) {
        // Changing vote
        if (previousVote === 'pass') { newPass--; newFail++ }
        else { newFail--; newPass++ }
      } else {
        // New vote
        if (vote === 'pass') newPass++
        else newFail++
      }
    }

    optimisticCounts.value[clusterId] = {
      passCount: Math.max(0, newPass),
      failCount: Math.max(0, newFail),
      totalVotes: Math.max(0, newPass) + Math.max(0, newFail),
    }

    try {
      await $fetch('/api/votes', {
        method: 'POST',
        body: { clusterId, vote },
      })
      // Sync with server
      await refreshVotes()
    } catch (err: any) {
      // Revert optimistic state
      delete optimisticVotes.value[clusterId]
      delete optimisticCounts.value[clusterId]

      if (err?.statusCode === 429) {
        toast.add({ title: 'Slow down', description: 'Vote rate limit exceeded. Try again later.', color: 'warning' })
      } else {
        toast.add({ title: 'Vote failed', description: 'Something went wrong.', color: 'error' })
      }
    } finally {
      // Clear optimistic overrides now that server state is synced
      delete optimisticCounts.value[clusterId]
      voting.value = false
    }
  }

  return { getUserVote, getVoteCounts, castVote, voting }
}
