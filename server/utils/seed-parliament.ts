import { drizzle } from 'drizzle-orm/d1'
import { eq, count } from 'drizzle-orm'
import { electorates, politicians } from '../database/schema'

const APH_SEARCH_URL = 'https://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results'

const STATE_ABBREVIATIONS: Record<string, string> = {
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'Queensland': 'QLD',
  'Western Australia': 'WA',
  'South Australia': 'SA',
  'Tasmania': 'TAS',
  'Australian Capital Territory': 'ACT',
  'Northern Territory': 'NT',
}

interface ParsedMember {
  name: string
  electorate: string
  state: string
  party: string
  chamber: 'house' | 'senate'
  imageUrl?: string
}

function parseMembers(html: string, chamber: 'house' | 'senate'): ParsedMember[] {
  const members: ParsedMember[] = []

  // Match each result card in the search results
  // The APH page uses <a> tags with class "card-link" for each member
  const cardRegex = /<div class="row row-bottom-padding"[^>]*>([\s\S]*?)(?=<div class="row row-bottom-padding"|<div class="pagination">|$)/g
  let match

  while ((match = cardRegex.exec(html)) !== null) {
    const card = match[1]

    // Extract name from title link
    const nameMatch = card.match(/class="title"[^>]*>([^<]+)</i)
    if (!nameMatch) continue

    // Clean name: remove titles like "Hon", "Dr", "MP", "Senator"
    let name = nameMatch[1].trim()
      .replace(/^(Hon\s+|Senator\s+|The\s+Hon\s+|Dr\s+|Mr\s+|Mrs\s+|Ms\s+|Miss\s+)+/gi, '')
      .replace(/\s+(MP|OAM|AC|AO|QC|SC|KC)$/gi, '')
      .trim()

    // Extract electorate/representing info
    const representingMatch = card.match(/Member for ([^<,]+)/i)
      || card.match(/Senator for ([^<,]+)/i)
      || card.match(/Representing ([^<,]+)/i)
    const electorate = representingMatch ? representingMatch[1].trim() : ''

    // Extract state
    const stateMatch = card.match(/(?:,\s*)((?:New South Wales|Victoria|Queensland|Western Australia|South Australia|Tasmania|Australian Capital Territory|Northern Territory))/i)
    const stateAbbr = stateMatch ? STATE_ABBREVIATIONS[stateMatch[1]] || stateMatch[1] : ''

    // Extract party
    const partyMatch = card.match(/class="party"[^>]*>([^<]+)/i)
      || card.match(/party[^>]*>([^<]+)/i)
    const party = partyMatch ? partyMatch[1].trim() : 'Unknown'

    // Extract image URL
    const imageMatch = card.match(/src="(https:\/\/parlinfo[^"]+)"/i)
    const imageUrl = imageMatch ? imageMatch[1] : undefined

    if (name && (electorate || chamber === 'senate')) {
      members.push({
        name,
        electorate,
        state: stateAbbr,
        party,
        chamber,
        imageUrl,
      })
    }
  }

  return members
}

async function fetchAllMembers(chamber: 'house' | 'senate'): Promise<ParsedMember[]> {
  const memParam = chamber === 'house' ? '1' : '2'
  const allMembers: ParsedMember[] = []
  let page = 1
  const pageSize = 96

  while (true) {
    const url = `${APH_SEARCH_URL}?expand=1&q=&mem=${memParam}&par=-1&gen=0&ps=${pageSize}&st=1&page=${page}`
    const response = await fetch(url)
    if (!response.ok) break

    const html = await response.text()
    const members = parseMembers(html, chamber)

    if (members.length === 0) break
    allMembers.push(...members)

    // Check if there are more pages
    if (!html.includes(`page=${page + 1}`)) break
    page++
  }

  return allMembers
}

export async function seedParliament(db: ReturnType<typeof drizzle>) {
  // Check if already seeded
  const [electorateCount] = await db.select({ value: count() }).from(electorates)
  if (electorateCount.value > 0) {
    console.log('Parliament data already seeded, skipping')
    return
  }

  console.log('Seeding parliament data from APH...')

  // Fetch House of Representatives members
  const houseMembers = await fetchAllMembers('house')
  console.log(`Fetched ${houseMembers.length} House members`)

  // Fetch Senators
  const senateMembers = await fetchAllMembers('senate')
  console.log(`Fetched ${senateMembers.length} Senators`)

  // Extract unique electorates from House members
  const electorateMap = new Map<string, string>() // name -> state
  for (const member of houseMembers) {
    if (member.electorate && member.state) {
      electorateMap.set(member.electorate, member.state)
    }
  }

  // Insert electorates
  const electorateInserts = Array.from(electorateMap.entries()).map(([name, state]) => ({
    name,
    state,
  }))

  if (electorateInserts.length > 0) {
    await db.insert(electorates).values(electorateInserts)
    console.log(`Inserted ${electorateInserts.length} electorates`)
  }

  // Build electorate ID lookup
  const allElectorates = await db.select().from(electorates)
  const electorateIdMap = new Map(allElectorates.map(e => [e.name, e.id]))

  // Insert politicians (House members)
  for (const member of houseMembers) {
    await db.insert(politicians).values({
      name: member.name,
      displayName: member.name,
      party: member.party,
      chamber: 'house',
      electorateId: electorateIdMap.get(member.electorate) || null,
      state: member.state,
      photoUrl: member.imageUrl || null,
    })
  }
  console.log(`Inserted ${houseMembers.length} House members`)

  // Insert politicians (Senators)
  for (const member of senateMembers) {
    await db.insert(politicians).values({
      name: member.name,
      displayName: member.name,
      party: member.party,
      chamber: 'senate',
      state: member.state,
      photoUrl: member.imageUrl || null,
    })
  }
  console.log(`Inserted ${senateMembers.length} Senators`)

  console.log('Parliament seeding complete')
}
