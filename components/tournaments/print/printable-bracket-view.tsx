'use client'

import React, { useMemo } from 'react'
import { Match } from '@/types/models'
import BracketGenerator from '../bracket/BracketGenerator'
import { transformMatchToGame } from '@/lib/utils/bracket-data-transformer'
import { Game } from '@/lib/types/bracket-models'
import { getBeltSkillCategory } from '@/lib/utils'

interface PrintableBracketViewProps {
  matches: Match[]
  participants: any[]
  tournament: any
}

export function PrintableBracketView({ matches, participants, tournament }: PrintableBracketViewProps) {
  
  // Logic copied and adapted from BracketView to split matches into specific bracket trees (islands)
  const divisionGroups = useMemo(() => {
    // 1. Initial grouping by Division + Category
    const rawGroups: Record<string, Match[]> = {}
    
    matches.forEach((match: any) => {
      const key = `${match.division_id || 'no-division'}_${match.category_id || 'no-category'}`
      if (!rawGroups[key]) rawGroups[key] = []
      rawGroups[key].push(match)
    })

    const refinedGroups: Array<{
       id: string,
       matches: Match[],
       divisionId: string | null,
       categoryId: string | null,
       title: string
    }> = []

    Object.entries(rawGroups).forEach(([baseKey, groupMatches]) => {
      // Build adjacency graph for this group
      const adj = new Map<string, string[]>()
      const matchMap = new Map<string, Match>()
      
      groupMatches.forEach(m => {
        matchMap.set(m.id, m)
        if (!adj.has(m.id)) adj.set(m.id, [])
        
        // Link via next_match_id (Child -> Parent)
        if (m.next_match_id) {
          adj.get(m.id)!.push(m.next_match_id)
          if (!adj.has(m.next_match_id)) adj.set(m.next_match_id, [])
          adj.get(m.next_match_id)!.push(m.id) 
        }
      })

      // Find connected components (islands)
      const visited = new Set<string>()
      const components: Match[][] = []

      groupMatches.forEach(startMatch => {
        if (!visited.has(startMatch.id)) {
          const queue = [startMatch.id]
          visited.add(startMatch.id)
          const islandMatches: Match[] = []

          while (queue.length > 0) {
            const currentId = queue.shift()!
            islandMatches.push(matchMap.get(currentId)!)
            
            const neighbors = adj.get(currentId) || []
            neighbors.forEach(nId => {
              if (!visited.has(nId)) {
                visited.add(nId)
                queue.push(nId)
              }
            })
          }
           components.push(islandMatches)
        }
      })

      // Create a final group for each island
      components.forEach((islandMatches, idx) => {
        // Determine label for this island (e.g., "Novice I" vs "Advanced")
        // by looking at ANY player in this specific tree
        let skillLabel = ''
        const type = tournament.tournament_type || 'standard'
        
        if (type === 'standard') {
            // Find a player to representative skill using match relations directly
            // This is safer than looking up in participants array
            for (const m of islandMatches) {
                const anyMatch = m as any
                const p1 = anyMatch.player1
                const p2 = anyMatch.player2
                
                // Check player data joined directly on match
                if (p1?.belt_level) {
                    skillLabel = getBeltSkillCategory(p1.belt_level)
                    break
                }
                if (p2?.belt_level) {
                     skillLabel = getBeltSkillCategory(p2.belt_level)
                     break
                }

                // Fallback to participants array if match relation missing (unlikely given query)
                const pid = m.player1_id || m.player2_id
                if (pid) {
                    const p = participants.find((part: any) => part.player_id === pid)
                    if (p?.player?.belt_level) {
                        skillLabel = getBeltSkillCategory(p.player.belt_level)
                        break
                    }
                }
            }
        }

        const div = (islandMatches[0] as any).tournament_divisions
        const cat = (islandMatches[0] as any).tournament_categories
        
        let title = 'General Division'
        if (div && cat) {
             // Logic replicated from BracketView.tsx `getDivisionLabel`
             const categoryName = cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase()
             const isYouth = div.name.toLowerCase().includes('cadet') || div.name.toLowerCase().includes('gradeschool')
             let genderLabel = ''
             
             const gender = cat.gender?.toLowerCase()
             if (gender === 'male') {
                genderLabel = isYouth ? 'Boys' : 'Men'
             } else if (gender === 'female') {
                genderLabel = isYouth ? 'Girls' : 'Women'
             }
             
             const skillLevelLabel = (type === 'standard' && skillLabel) ? ` ${skillLabel}` : ''
             title = `${div.name} ${genderLabel}${skillLevelLabel} - ${categoryName}`.trim()
        }

        if (components.length > 1 && !title.includes('Group')) {
             if (div && div.name.toLowerCase().includes('gradeschool')) {
                 title += ` (Group ${idx + 1})`
             }
        }

        refinedGroups.push({
            id: `${baseKey}_${idx}`,
            matches: islandMatches,
            divisionId: div?.id || null,
            categoryId: cat?.id || null,
            title
        })
      })
    })

    return refinedGroups.sort((a, b) => a.title.localeCompare(b.title))
  }, [matches, participants, tournament])

  return (
    <div className="printable-bracket-container p-8">
       <style jsx global>{`
        @media print {
            @page { size: landscape; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; }
            .break-after { page-break-after: always; }
            .avoid-break { page-break-inside: avoid; }
        }
      `}</style>
      
      <div className="text-center mb-8 hidden print:block">
        <h1 className="text-3xl font-bold uppercase">{tournament.name}</h1>
        <p className="text-sm text-gray-500">Official Brackets</p>
      </div>

      {divisionGroups.length === 0 && (
         <div className="text-center text-gray-500">No brackets found.</div>
      )}

      {divisionGroups.map((group, idx) => {
        // Find the "Finals" (roots) of this specific island/tree
        // The root is the match with the highest round number
        const maxRound = Math.max(...group.matches.map(m => m.round || m.match_number || 0)) // Fallback if round missing
        // Filter matches that are in the max round
        const rootMatches = group.matches.filter(m => (m.round || 0) === maxRound)

        // If no round info specifically, maybe look for match with no next_match_id?
        // But in circular or weird graphs that might fail. Rounds is safer if populated.
        // Fallback: matches with no next_match_id (should be the final)
        const effectiveRoots = rootMatches.length > 0 ? rootMatches : group.matches.filter(m => !m.next_match_id)

        const games: Game[] = effectiveRoots.map(m => transformMatchToGame(m, group.matches, participants))
        
        return (
          <div key={group.id} className="mb-12 break-after last:break-after-auto avoid-break">
            <div className="border-b-2 border-black mb-6 pb-2">
                <h2 className="text-2xl font-bold">{group.title}</h2>
            </div>
            {/* Render the bracket tree directly */}
            <div className="flex justify-center">
                 <BracketGenerator 
                    games={games}
                    onMatchClick={() => {}} // No interaction needed
                    isOrganizer={false}
                    onEditMatch={() => {}} 
                 />
            </div>
          </div>
        )
      })}
    </div>
  )
}
