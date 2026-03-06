// Hex cartogram layout for Australian federal electorates
// Each electorate is mapped to a hex grid position (col, row)
// positioned roughly by geographic location, giving equal visual weight to each seat.
//
// Layout uses offset hex coordinates (odd-r offset).
// States are grouped geographically: WA left, QLD top-right, NSW/VIC bottom-right, etc.

export interface HexPosition {
  electorate: string
  col: number
  row: number
  state: string
}

// Hex positions for all 151 electorates
// Grouped by state for readability. Positions are approximate geographic placement.
export const hexLayout: HexPosition[] = [
  // === NT (2 seats) ===
  { electorate: 'Lingiari', col: 7, row: 0, state: 'NT' },
  { electorate: 'Solomon', col: 8, row: 0, state: 'NT' },

  // === QLD (30 seats) ===
  { electorate: 'Leichhardt', col: 14, row: 0, state: 'QLD' },
  { electorate: 'Kennedy', col: 13, row: 0, state: 'QLD' },
  { electorate: 'Herbert', col: 14, row: 1, state: 'QLD' },
  { electorate: 'Dawson', col: 13, row: 1, state: 'QLD' },
  { electorate: 'Capricornia', col: 13, row: 2, state: 'QLD' },
  { electorate: 'Flynn', col: 12, row: 1, state: 'QLD' },
  { electorate: 'Hinkler', col: 14, row: 2, state: 'QLD' },
  { electorate: 'Wide Bay', col: 14, row: 3, state: 'QLD' },
  { electorate: 'Maranoa', col: 11, row: 2, state: 'QLD' },
  { electorate: 'Groom', col: 12, row: 3, state: 'QLD' },
  { electorate: 'Fisher', col: 13, row: 3, state: 'QLD' },
  { electorate: 'Fairfax', col: 14, row: 4, state: 'QLD' },
  { electorate: 'Longman', col: 13, row: 4, state: 'QLD' },
  { electorate: 'Dickson', col: 14, row: 5, state: 'QLD' },
  { electorate: 'Petrie', col: 13, row: 5, state: 'QLD' },
  { electorate: 'Lilley', col: 15, row: 5, state: 'QLD' },
  { electorate: 'Brisbane', col: 14, row: 6, state: 'QLD' },
  { electorate: 'Ryan', col: 13, row: 6, state: 'QLD' },
  { electorate: 'Moreton', col: 14, row: 7, state: 'QLD' },
  { electorate: 'Griffith', col: 15, row: 6, state: 'QLD' },
  { electorate: 'Bonner', col: 15, row: 7, state: 'QLD' },
  { electorate: 'Rankin', col: 13, row: 7, state: 'QLD' },
  { electorate: 'Oxley', col: 12, row: 6, state: 'QLD' },
  { electorate: 'Blair', col: 12, row: 5, state: 'QLD' },
  { electorate: 'Wright', col: 12, row: 4, state: 'QLD' },
  { electorate: 'McPherson', col: 15, row: 8, state: 'QLD' },
  { electorate: 'Fadden', col: 14, row: 8, state: 'QLD' },
  { electorate: 'Forde', col: 13, row: 8, state: 'QLD' },
  { electorate: 'Moncrieff', col: 15, row: 9, state: 'QLD' },
  { electorate: 'Bowman', col: 16, row: 6, state: 'QLD' },

  // === WA (15 seats) ===
  { electorate: 'Durack', col: 2, row: 2, state: 'WA' },
  { electorate: 'O\'Connor', col: 3, row: 4, state: 'WA' },
  { electorate: 'Pearce', col: 3, row: 5, state: 'WA' },
  { electorate: 'Moore', col: 2, row: 5, state: 'WA' },
  { electorate: 'Cowan', col: 3, row: 6, state: 'WA' },
  { electorate: 'Stirling', col: 2, row: 6, state: 'WA' },
  { electorate: 'Perth', col: 3, row: 7, state: 'WA' },
  { electorate: 'Curtin', col: 2, row: 7, state: 'WA' },
  { electorate: 'Hasluck', col: 4, row: 6, state: 'WA' },
  { electorate: 'Swan', col: 3, row: 8, state: 'WA' },
  { electorate: 'Tangney', col: 2, row: 8, state: 'WA' },
  { electorate: 'Burt', col: 4, row: 7, state: 'WA' },
  { electorate: 'Canning', col: 4, row: 8, state: 'WA' },
  { electorate: 'Fremantle', col: 2, row: 9, state: 'WA' },
  { electorate: 'Brand', col: 3, row: 9, state: 'WA' },

  // === SA (10 seats) ===
  { electorate: 'Grey', col: 7, row: 4, state: 'SA' },
  { electorate: 'Barker', col: 7, row: 6, state: 'SA' },
  { electorate: 'Mayo', col: 8, row: 6, state: 'SA' },
  { electorate: 'Sturt', col: 8, row: 5, state: 'SA' },
  { electorate: 'Boothby', col: 7, row: 7, state: 'SA' },
  { electorate: 'Adelaide', col: 8, row: 7, state: 'SA' },
  { electorate: 'Makin', col: 9, row: 5, state: 'SA' },
  { electorate: 'Kingston', col: 7, row: 8, state: 'SA' },
  { electorate: 'Hindmarsh', col: 8, row: 8, state: 'SA' },
  { electorate: 'Spence', col: 9, row: 6, state: 'SA' },

  // === NSW (47 seats) ===
  { electorate: 'New England', col: 13, row: 9, state: 'NSW' },
  { electorate: 'Cowper', col: 14, row: 9, state: 'NSW' },
  { electorate: 'Page', col: 14, row: 10, state: 'NSW' },
  { electorate: 'Richmond', col: 15, row: 10, state: 'NSW' },
  { electorate: 'Lyne', col: 13, row: 10, state: 'NSW' },
  { electorate: 'Parkes', col: 11, row: 9, state: 'NSW' },
  { electorate: 'Calare', col: 12, row: 9, state: 'NSW' },
  { electorate: 'Hunter', col: 13, row: 11, state: 'NSW' },
  { electorate: 'Paterson', col: 14, row: 11, state: 'NSW' },
  { electorate: 'Shortland', col: 15, row: 11, state: 'NSW' },
  { electorate: 'Newcastle', col: 14, row: 12, state: 'NSW' },
  { electorate: 'Charlton', col: 13, row: 12, state: 'NSW' },
  { electorate: 'Riverina', col: 10, row: 10, state: 'NSW' },
  { electorate: 'Hume', col: 11, row: 10, state: 'NSW' },
  { electorate: 'Whitlam', col: 12, row: 11, state: 'NSW' },
  { electorate: 'Cunningham', col: 13, row: 13, state: 'NSW' },
  { electorate: 'Gilmore', col: 12, row: 13, state: 'NSW' },
  { electorate: 'Eden-Monaro', col: 11, row: 13, state: 'NSW' },
  { electorate: 'Farrer', col: 10, row: 11, state: 'NSW' },
  { electorate: 'Dobell', col: 14, row: 13, state: 'NSW' },
  { electorate: 'Robertson', col: 15, row: 12, state: 'NSW' },
  { electorate: 'Macquarie', col: 12, row: 12, state: 'NSW' },
  { electorate: 'Blue Mountains', col: 11, row: 12, state: 'NSW' },
  { electorate: 'Lindsay', col: 12, row: 14, state: 'NSW' },
  { electorate: 'Werriwa', col: 13, row: 14, state: 'NSW' },
  { electorate: 'Macarthur', col: 12, row: 15, state: 'NSW' },
  { electorate: 'Hughes', col: 13, row: 15, state: 'NSW' },
  { electorate: 'Cook', col: 14, row: 15, state: 'NSW' },
  { electorate: 'Barton', col: 15, row: 14, state: 'NSW' },
  { electorate: 'Banks', col: 14, row: 14, state: 'NSW' },
  { electorate: 'Blaxland', col: 13, row: 16, state: 'NSW' },
  { electorate: 'Watson', col: 14, row: 16, state: 'NSW' },
  { electorate: 'Fowler', col: 12, row: 16, state: 'NSW' },
  { electorate: 'McMahon', col: 11, row: 14, state: 'NSW' },
  { electorate: 'Chifley', col: 11, row: 15, state: 'NSW' },
  { electorate: 'Greenway', col: 11, row: 16, state: 'NSW' },
  { electorate: 'Mitchell', col: 12, row: 10, state: 'NSW' },
  { electorate: 'Berowra', col: 13, row: 17, state: 'NSW' },
  { electorate: 'Bennelong', col: 14, row: 17, state: 'NSW' },
  { electorate: 'Parramatta', col: 12, row: 17, state: 'NSW' },
  { electorate: 'Reid', col: 15, row: 15, state: 'NSW' },
  { electorate: 'Grayndler', col: 15, row: 16, state: 'NSW' },
  { electorate: 'Sydney', col: 16, row: 15, state: 'NSW' },
  { electorate: 'Wentworth', col: 16, row: 16, state: 'NSW' },
  { electorate: 'Kingsford Smith', col: 15, row: 17, state: 'NSW' },
  { electorate: 'North Sydney', col: 16, row: 14, state: 'NSW' },
  { electorate: 'Bradfield', col: 16, row: 17, state: 'NSW' },

  // === ACT (3 seats) ===
  { electorate: 'Fenner', col: 10, row: 13, state: 'ACT' },
  { electorate: 'Bean', col: 10, row: 14, state: 'ACT' },
  { electorate: 'Canberra', col: 10, row: 12, state: 'ACT' },

  // === VIC (39 seats) ===
  { electorate: 'Mallee', col: 8, row: 10, state: 'VIC' },
  { electorate: 'Wannon', col: 8, row: 12, state: 'VIC' },
  { electorate: 'Nicholls', col: 9, row: 10, state: 'VIC' },
  { electorate: 'Indi', col: 10, row: 9, state: 'VIC' },
  { electorate: 'Bendigo', col: 9, row: 11, state: 'VIC' },
  { electorate: 'Ballarat', col: 8, row: 11, state: 'VIC' },
  { electorate: 'Corangamite', col: 8, row: 13, state: 'VIC' },
  { electorate: 'Corio', col: 8, row: 14, state: 'VIC' },
  { electorate: 'Gorton', col: 8, row: 15, state: 'VIC' },
  { electorate: 'Gellibrand', col: 8, row: 16, state: 'VIC' },
  { electorate: 'Lalor', col: 7, row: 15, state: 'VIC' },
  { electorate: 'Calwell', col: 9, row: 13, state: 'VIC' },
  { electorate: 'McEwen', col: 9, row: 12, state: 'VIC' },
  { electorate: 'Scullin', col: 9, row: 14, state: 'VIC' },
  { electorate: 'Cooper', col: 9, row: 15, state: 'VIC' },
  { electorate: 'Maribyrnong', col: 8, row: 17, state: 'VIC' },
  { electorate: 'Melbourne', col: 9, row: 16, state: 'VIC' },
  { electorate: 'Wills', col: 9, row: 17, state: 'VIC' },
  { electorate: 'Jagajaga', col: 10, row: 15, state: 'VIC' },
  { electorate: 'Menzies', col: 10, row: 16, state: 'VIC' },
  { electorate: 'Kooyong', col: 9, row: 18, state: 'VIC' },
  { electorate: 'Higgins', col: 8, row: 18, state: 'VIC' },
  { electorate: 'Hotham', col: 9, row: 19, state: 'VIC' },
  { electorate: 'Bruce', col: 10, row: 18, state: 'VIC' },
  { electorate: 'Chisholm', col: 10, row: 17, state: 'VIC' },
  { electorate: 'Deakin', col: 10, row: 19, state: 'VIC' },
  { electorate: 'Aston', col: 11, row: 17, state: 'VIC' },
  { electorate: 'Casey', col: 11, row: 18, state: 'VIC' },
  { electorate: 'La Trobe', col: 11, row: 19, state: 'VIC' },
  { electorate: 'Monash', col: 10, row: 20, state: 'VIC' },
  { electorate: 'Isaacs', col: 9, row: 20, state: 'VIC' },
  { electorate: 'Goldstein', col: 8, row: 19, state: 'VIC' },
  { electorate: 'Macnamara', col: 8, row: 20, state: 'VIC' },
  { electorate: 'Dunkley', col: 9, row: 21, state: 'VIC' },
  { electorate: 'Flinders', col: 10, row: 21, state: 'VIC' },
  { electorate: 'Hawke', col: 7, row: 14, state: 'VIC' },
  { electorate: 'Fraser', col: 7, row: 13, state: 'VIC' },
  { electorate: 'Gippsland', col: 11, row: 20, state: 'VIC' },
  { electorate: 'Monbulk', col: 11, row: 21, state: 'VIC' },

  // === TAS (5 seats) ===
  { electorate: 'Bass', col: 10, row: 22, state: 'TAS' },
  { electorate: 'Braddon', col: 9, row: 22, state: 'TAS' },
  { electorate: 'Lyons', col: 10, row: 23, state: 'TAS' },
  { electorate: 'Clark', col: 9, row: 23, state: 'TAS' },
  { electorate: 'Franklin', col: 9, row: 24, state: 'TAS' },
]

// State colour for party affiliation
export const partyColors: Record<string, string> = {
  'Labor': '#E53E3E',
  'Australian Labor Party': '#E53E3E',
  'Liberal': '#3B82F6',
  'Liberal Party of Australia': '#3B82F6',
  'Nationals': '#065F46',
  'National Party of Australia': '#065F46',
  'Liberal National Party of Queensland': '#6366F1',
  'Greens': '#10B981',
  'Australian Greens': '#10B981',
  'Independent': '#9CA3AF',
  'Katter\'s Australian Party': '#92400E',
  'Centre Alliance': '#F59E0B',
}

// Approval-based colour: green (high) → yellow (mid) → red (low)
export function approvalColor(pct: number | null): string {
  if (pct === null) return '#D1D5DB' // gray for no data
  // Interpolate green-yellow-red
  if (pct >= 50) {
    // 50-100: yellow → green
    const t = (pct - 50) / 50
    const r = Math.round(234 - t * 218)
    const g = Math.round(179 + t * 56)
    const b = Math.round(8 + t * 30)
    return `rgb(${r}, ${g}, ${b})`
  } else {
    // 0-50: red → yellow
    const t = pct / 50
    const r = Math.round(220 + t * 14)
    const g = Math.round(38 + t * 141)
    const b = Math.round(38 - t * 30)
    return `rgb(${r}, ${g}, ${b})`
  }
}
