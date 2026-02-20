'use client'

import { useState } from 'react'
import { Match } from '@/types/models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, getBeltSkillCategory, getCategoryDisplayName } from '@/lib/utils'

interface DivisionBreakdownProps {
  matches: Match[]
  participants?: any[]
}

const SKILL_ORDER = ['Beginner', 'Novice I', 'Novice II', 'Advanced', 'Unknown']
const ITEMS_PER_PAGE = 5

export function DivisionBreakdown({ matches, participants = [] }: DivisionBreakdownProps) {
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate Stats
  const divisionStats: Record<string, { 
    players: Set<string>, 
    matches: number,
    rows: Map<string, { category: string, skill: string, playerCount: Set<string>, matchCount: number, completedCount: number }>
  }> = {}

  // Filter matches to only include relevant lifecycle states
  const relevantMatches = matches.filter((m: any) => {
    const state = m.lifecycle_state
    return state === 'WAITING' || state === 'CONTEST' || state === 'IN_PROGRESS' || state === 'COMPLETED' || state === 'AUTO_ADVANCE' || state === null || state === undefined
  })

  if (relevantMatches.length > 0) {
    relevantMatches.forEach((match: any) => {
      const divName = match.tournament_divisions?.name
      const catName = match.tournament_categories?.name
      const catGender = match.tournament_categories?.gender
      
      // Skip matches without division/category data
      if (!divName || !catName) return
      
      // Get skill level directly from match (set during bracket generation)
      // For Standard tournaments: Beginner, Novice, Advanced I, Advanced II
      // For Open Belt tournaments: null
      let skill = (match as any).skill_level || 'Unknown'
      
      // Skip matches with Unknown/null skill (Open Belt tournaments or old data)
      if (!skill || skill === 'Unknown') return
      
      // Get gender label (Boys/Girls for youth, Men/Women for senior)
      const genderLabel = catGender === 'both' ? 'Mixed' : 
        (divName.toLowerCase().includes('senior') 
          ? (catGender === 'male' ? 'Men' : 'Women')
          : (catGender === 'male' ? 'Boys' : 'Girls'))
      
      // Normalize category name for weight/height group
      const normalizedCatName = getCategoryDisplayName(catName)
      
      // Build full category name: "Division Gender Skill WeightGroup"
      // Example: "Gradeschool Boys Novice Group 0"
      const fullCategoryName = `${divName} ${genderLabel} ${skill} ${normalizedCatName}`.trim()
      
      // Include all matches - organizers need to see everything
      
      if (!divisionStats[divName]) {
        divisionStats[divName] = { players: new Set(), matches: 0, rows: new Map() }
      }
      
      if (match.player1_id) divisionStats[divName].players.add(match.player1_id)
      if (match.player2_id) divisionStats[divName].players.add(match.player2_id)
      if (match.lifecycle_state !== 'AUTO_ADVANCE') divisionStats[divName].matches++
      
      // Use full category name as the row key
      const rowKey = fullCategoryName
      if (!divisionStats[divName].rows.has(rowKey)) {
        divisionStats[divName].rows.set(rowKey, {
          category: fullCategoryName,
          skill: skill,
          playerCount: new Set(),
          matchCount: 0,
          completedCount: 0
        })
      }
      
      const row = divisionStats[divName].rows.get(rowKey)!
      if (match.player1_id) row.playerCount.add(match.player1_id)
      if (match.player2_id) row.playerCount.add(match.player2_id)
      if (match.lifecycle_state !== 'AUTO_ADVANCE') row.matchCount++
      if (match.lifecycle_state === 'COMPLETED') row.completedCount++
    })
  }

  const sortedDivisionNames = Object.keys(divisionStats).sort((a, b) => {
    // Define strict division order
    const divisionOrder = ['Gradeschool', 'Cadet', 'Junior', 'Senior']
    const indexA = divisionOrder.indexOf(a)
    const indexB = divisionOrder.indexOf(b)
    
    // If both divisions are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    
    // If only one is in the list, prioritize it
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    
    // Otherwise, sort alphabetically
    return a.localeCompare(b)
  })
  const activeDivision = selectedDivision || (sortedDivisionNames.length > 0 ? sortedDivisionNames[0] : '')

  if (matches.length === 0) return null

  return (
    <Card className="col-span-full mt-4">
      <CardHeader className="py-4 px-6 border-b">
        <CardTitle className="text-base">Breakdown per Division</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {sortedDivisionNames.length > 0 ? (
          <Tabs value={activeDivision} onValueChange={(val) => {
              setSelectedDivision(val)
              setCurrentPage(1)
          }} className="w-full">
            <div className="w-full overflow-x-auto pb-2 mb-4">
              <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 inline-flex min-w-full">
                {sortedDivisionNames.map(name => (
                  <TabsTrigger key={name} value={name} className="px-4 py-2 whitespace-nowrap">{name}</TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            {sortedDivisionNames.map(divName => {
              const stats = divisionStats[divName]
              const rows = Array.from(stats.rows.values())
                .filter(r => {
                  if (!searchFilter.trim()) return true
                  return r.category.toLowerCase().includes(searchFilter.toLowerCase())
                })
                // Sort by Skill Order first, then by weight/height group
                .sort((a, b) => {
                    // Extract skill from category name for sorting
                    const getSkillPriority = (cat: string) => {
                      if (cat.includes('Beginner')) return 0
                      if (cat.includes('Novice')) return 1
                      if (cat.includes('Advanced I')) return 2
                      if (cat.includes('Advanced II')) return 3
                      return 4 // Unknown
                    }
                    
                    // Extract weight/height group for secondary sorting
                    const getGroupPriority = (cat: string) => {
                      // Height groups (Gradeschool): Group 0, Group 1, ... Group 6
                      const heightMatch = cat.match(/Group (\d+)/)
                      if (heightMatch) {
                        return parseInt(heightMatch[1])
                      }
                      
                      // Weight groups (other divisions): Fin, Fly, Bantam, Feather, Lt. Feather, Light, Lt. Middle, Middle, Lt. Heavy, Heavy
                      const weightOrder = [
                        'Fin', 'Fly', 'Bantam', 'Feather', 'Lt. Feather', 
                        'Light', 'Lt. Middle', 'Middle', 'Lt. Heavy', 'Heavy'
                      ]
                      
                      for (let i = 0; i < weightOrder.length; i++) {
                        if (cat.includes(weightOrder[i])) {
                          return i
                        }
                      }
                      
                      return 999 // Unknown group
                    }
                    
                    // First sort by skill level
                    const skillDiff = getSkillPriority(a.category) - getSkillPriority(b.category)
                    if (skillDiff !== 0) return skillDiff
                    
                    // Then sort by weight/height group
                    const groupDiff = getGroupPriority(a.category) - getGroupPriority(b.category)
                    if (groupDiff !== 0) return groupDiff
                    
                    // Finally, alphabetically as fallback
                    return a.category.localeCompare(b.category)
                })

              // Pagination Logic
              const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE)
              const paginatedRows = rows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                
              return (
                <TabsContent key={divName} value={divName} className="mt-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{stats.players.size}</span> Players • <span className="font-medium text-foreground">{stats.matches}</span> Matches
                    </div>
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={searchFilter}
                      onChange={(e) => {
                        setSearchFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="px-3 py-2 text-sm border rounded-md w-full sm:w-[250px] focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-full lg:w-[300px]">Full Category</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Players</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Total Matches</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Completed</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Remaining</TableHead>
                        <TableHead className="w-[180px] lg:w-[220px]">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No data matching filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRows.map((row, idx) => {
                          const rowProgress = row.matchCount > 0 ? Math.round((row.completedCount / row.matchCount) * 100) : 0
                          const matchesLeft = row.matchCount - row.completedCount
                          
                          return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-sm lg:text-base">{row.category}</TableCell>
                            <TableCell className="hidden lg:table-cell text-right">{row.playerCount.size}</TableCell>
                            <TableCell className="hidden lg:table-cell text-right">{row.matchCount}</TableCell>
                            <TableCell className="hidden lg:table-cell text-right">{row.completedCount}</TableCell>
                            <TableCell className="hidden lg:table-cell text-right font-medium text-muted-foreground">{matchesLeft}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                  <Tooltip delayDuration={0}>
                                      <TooltipTrigger asChild>
                                          <div className="flex items-center gap-2 cursor-help">
                                              <Progress value={rowProgress} className="h-2 w-full" />
                                              <span className="text-xs text-muted-foreground w-8 text-right">{rowProgress}%</span>
                                          </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p>{matchesLeft} matches left</p>
                                      </TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        )})
                      )}
                    </TableBody>
                  </Table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                      <div className="flex items-center justify-end space-x-2 py-4">
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                          >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                          </Button>
                          <div className="text-xs text-muted-foreground">
                              Page {currentPage} of {totalPages}
                          </div>
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                          >
                              Next
                              <ChevronRight className="h-4 w-4" />
                          </Button>
                      </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No divisions found</div>
        )}
      </CardContent>
    </Card>
  )
}
