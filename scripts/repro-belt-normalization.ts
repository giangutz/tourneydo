// Mock `normalizeBelt` from lib/utils/match-scheduler.ts
function normalizeBelt(match: { belt_level?: string, category_name?: string }): number {
  let text = (match.belt_level || '').toLowerCase()
  if (!text) text = (match.category_name || '').toLowerCase()

  if (text.includes('white') || text === 'beginner') return 40
  if (text.includes('yellow') || text.includes('blue') || text.includes('novice')) return 30
  if (text.includes('red') || text.includes('brown') || text.includes('advanced 1')) return 20
  if (text.includes('black') || text.includes('advanced 2') || text.includes('advanced')) return 10
  return 0
}

const testCases = [
  { belt_level: 'Beginner' },
  { belt_level: '', category_name: 'Novice Group A' },
  { belt_level: null, category_name: 'Advanced 1' },
  { belt_level: '', category_name: 'Advanced' }
]

console.log('--- Testing normalizeBelt Rules (High = First) ---')
console.log('Expect: Beginner(40), Novice(30), Advanced 1(20), Advanced 2(10)')
testCases.forEach((t: any) => {
  console.log(`B: "${t.belt_level}" C: "${t.category_name}" -> ${normalizeBelt(t)}`)
})
