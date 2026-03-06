/**
 * Test the APH parliament seeder against the live site.
 * Run with: pnpm tsx scripts/test-seed.ts
 *
 * Does not touch the database — fetches, parses, and reports results.
 */

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

    const isSenator = /^Senator\s/i.test(fullName)
    const chamber: 'house' | 'senate' = isSenator ? 'senate' : 'house'

    const name = fullName
      .replace(/^(Senator\s+the\s+Hon\s+|The\s+Hon\s+|Hon\s+|Senator\s+|Dr\s+|Mr\s+|Mrs\s+|Ms\s+|Miss\s+|Prof\s+)+/gi, '')
      .replace(/\s+(MP|OAM|AC|AO|QC|SC|KC|AM|PSM)(,?\s*(MP|OAM|AC|AO|QC|SC|KC|AM|PSM))*$/gi, '')
      .trim()

    const forMatch = card.match(/<dt>For<\/dt>\s*<dd>([^<]+)<\/dd>/)
    let electorate = ''
    let stateAbbr = ''
    if (forMatch) {
      const parts = forMatch[1].split(',').map(s => s.trim())
      if (chamber === 'house' && parts.length >= 2) {
        electorate = parts[0]
        stateAbbr = STATE_ABBREVIATIONS[parts[parts.length - 1]] || parts[parts.length - 1]
      } else {
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
    console.log(`  Fetching page ${page}...`)

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ThePubTest/1.0)' },
    })
    if (!response.ok) {
      console.log(`  HTTP ${response.status}`)
      break
    }

    const html = await response.text()
    const members = parseSearchPage(html)
    console.log(`  Page ${page}: parsed ${members.length} members`)

    if (members.length === 0) break
    allMembers.push(...members)

    if (!html.includes(`page=${page + 1}`)) break
    page++
  }

  return allMembers
}

async function main() {
  console.log('=== APH Parliament Seeder Test ===\n')

  console.log('Fetching all parliamentarians...')
  const allMembers = await fetchAllMembers()

  const houseMembers = allMembers.filter(m => m.chamber === 'house')
  const senateMembers = allMembers.filter(m => m.chamber === 'senate')

  // Extract electorates
  const electorateMap = new Map<string, string>()
  for (const member of houseMembers) {
    if (member.electorate && member.state) {
      electorateMap.set(member.electorate, member.state)
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Total members: ${allMembers.length}`)
  console.log(`House members: ${houseMembers.length} (expected ~151)`)
  console.log(`Senators: ${senateMembers.length} (expected ~76)`)
  console.log(`Unique electorates: ${electorateMap.size} (expected ~151)`)

  // Validate
  const issues: string[] = []

  const missingElectorate = houseMembers.filter(m => !m.electorate)
  if (missingElectorate.length > 0) {
    issues.push(`${missingElectorate.length} House members missing electorate: ${missingElectorate.map(m => m.name).join(', ')}`)
  }

  const missingState = allMembers.filter(m => !m.state)
  if (missingState.length > 0) {
    issues.push(`${missingState.length} members missing state: ${missingState.map(m => m.name).join(', ')}`)
  }

  const unknownParty = allMembers.filter(m => m.party === 'Unknown')
  if (unknownParty.length > 0) {
    issues.push(`${unknownParty.length} members with unknown party: ${unknownParty.map(m => m.name).join(', ')}`)
  }

  if (issues.length > 0) {
    console.log(`\n=== Issues (${issues.length}) ===`)
    for (const issue of issues) {
      console.log(`  - ${issue}`)
    }
  } else {
    console.log('\nNo issues found!')
  }

  // State breakdown
  console.log('\n=== Electorates by State ===')
  const stateCount = new Map<string, number>()
  for (const [, state] of electorateMap) {
    stateCount.set(state, (stateCount.get(state) || 0) + 1)
  }
  for (const [state, ct] of [...stateCount.entries()].sort()) {
    console.log(`  ${state}: ${ct}`)
  }

  // Party breakdown
  console.log('\n=== Party Breakdown ===')
  const partyCount = new Map<string, number>()
  for (const member of allMembers) {
    partyCount.set(member.party, (partyCount.get(member.party) || 0) + 1)
  }
  for (const [party, ct] of [...partyCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${party}: ${ct}`)
  }

  // Samples
  console.log('\n=== Sample House Members (first 5) ===')
  for (const m of houseMembers.slice(0, 5)) {
    console.log(`  ${m.name} | ${m.electorate}, ${m.state} | ${m.party}`)
  }

  console.log('\n=== Sample Senators (first 5) ===')
  for (const m of senateMembers.slice(0, 5)) {
    console.log(`  ${m.name} | ${m.state} | ${m.party}`)
  }

  // Verdict
  const houseOk = houseMembers.length >= 140 && houseMembers.length <= 160
  const senateOk = senateMembers.length >= 70 && senateMembers.length <= 80
  const electoratesOk = electorateMap.size >= 140 && electorateMap.size <= 160

  console.log('\n=== Verdict ===')
  console.log(`House count in range:      ${houseOk ? 'PASS' : 'FAIL'} (${houseMembers.length})`)
  console.log(`Senate count in range:     ${senateOk ? 'PASS' : 'FAIL'} (${senateMembers.length})`)
  console.log(`Electorate count in range: ${electoratesOk ? 'PASS' : 'FAIL'} (${electorateMap.size})`)

  if (!houseOk || !senateOk || !electoratesOk) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
