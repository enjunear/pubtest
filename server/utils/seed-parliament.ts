import { drizzle } from 'drizzle-orm/d1'
import { count } from 'drizzle-orm'
import { electorates, politicians } from '../database/schema'

const APH_SEARCH_URL = 'https://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results'
const APH_BASE_URL = 'https://www.aph.gov.au'

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
  mpid: string
  fullName: string
  name: string
  electorate: string
  state: string
  party: string
  chamber: 'house' | 'senate'
  imageUrl: string
}

function parseSearchPage(html: string): ParsedMember[] {
  const members: ParsedMember[] = []

  const cards = html.split('<div class="row border-bottom')
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i]

    const titleMatch = card.match(/MPID=([^"]+)"[^>]*>([^<]+)<\/a>/)
    if (!titleMatch) continue

    const mpid = titleMatch[1]
    const fullName = titleMatch[2].trim()

    // Determine chamber from title: Senators have "Senator" prefix, House members have "MP" suffix
    const isSenator = /^Senator\s/i.test(fullName)
    const chamber: 'house' | 'senate' = isSenator ? 'senate' : 'house'

    // Clean name: remove honorifics and suffixes
    const name = fullName
      .replace(/^(Senator\s+the\s+Hon\s+|The\s+Hon\s+|Hon\s+|Senator\s+|Dr\s+|Mr\s+|Mrs\s+|Ms\s+|Miss\s+|Prof\s+)+/gi, '')
      .replace(/\s+(MP|OAM|AC|AO|QC|SC|KC|AM|PSM)(,?\s*(MP|OAM|AC|AO|QC|SC|KC|AM|PSM))*$/gi, '')
      .trim()

    // Extract electorate and state from "For" field
    // House: "Calwell, Victoria"  |  Senate: "Victoria"
    const forMatch = card.match(/<dt>For<\/dt>\s*<dd>([^<]+)<\/dd>/)
    let electorate = ''
    let stateAbbr = ''
    if (forMatch) {
      const parts = forMatch[1].split(',').map(s => s.trim())
      if (chamber === 'house' && parts.length >= 2) {
        electorate = parts[0]
        stateAbbr = STATE_ABBREVIATIONS[parts[parts.length - 1]] || parts[parts.length - 1]
      } else {
        // Senator or single value — it's just the state
        const stateName = parts[parts.length - 1]
        stateAbbr = STATE_ABBREVIATIONS[stateName] || stateName
      }
    }

    const partyMatch = card.match(/<dt>Party<\/dt>\s*<dd>([^<]+)<\/dd>/)
    const party = partyMatch ? partyMatch[1].trim() : 'Unknown'

    const imageUrl = `${APH_BASE_URL}/api/parliamentarian/${mpid}/image`

    members.push({ mpid, fullName, name, electorate, state: stateAbbr, party, chamber, imageUrl })
  }

  return members
}

async function fetchAllMembers(): Promise<ParsedMember[]> {
  const allMembers: ParsedMember[] = []
  let page = 1
  const pageSize = 96

  while (true) {
    const url = `${APH_SEARCH_URL}?expand=1&q=&par=-1&gen=0&ps=${pageSize}&st=1&page=${page}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ThePubTest/1.0)' },
    })

    if (!response.ok) break

    const html = await response.text()
    const members = parseSearchPage(html)

    if (members.length === 0) break
    allMembers.push(...members)

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

  const allMembers = await fetchAllMembers()
  const houseMembers = allMembers.filter(m => m.chamber === 'house')
  const senateMembers = allMembers.filter(m => m.chamber === 'senate')
  console.log(`Fetched ${houseMembers.length} House members, ${senateMembers.length} Senators`)

  // Extract unique electorates from House members
  const electorateMap = new Map<string, string>()
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

  // D1 has a parameter limit, so insert in batches
  for (const e of electorateInserts) {
    await db.insert(electorates).values(e)
  }
  console.log(`Inserted ${electorateInserts.length} electorates`)

  // Build electorate ID lookup
  const allElectorates = await db.select().from(electorates)
  const electorateIdMap = new Map(allElectorates.map(e => [e.name, e.id]))

  // Insert House members
  for (const member of houseMembers) {
    await db.insert(politicians).values({
      name: member.name,
      displayName: member.name,
      party: member.party,
      chamber: 'house',
      electorateId: electorateIdMap.get(member.electorate) || null,
      state: member.state,
      photoUrl: member.imageUrl,
    })
  }
  console.log(`Inserted ${houseMembers.length} House members`)

  // Insert Senators
  for (const member of senateMembers) {
    await db.insert(politicians).values({
      name: member.name,
      displayName: member.name,
      party: member.party,
      chamber: 'senate',
      state: member.state,
      photoUrl: member.imageUrl,
    })
  }
  console.log(`Inserted ${senateMembers.length} Senators`)

  console.log('Parliament seeding complete')
}

export { fetchAllMembers, parseSearchPage }
