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
import { cn } from '@/lib/utils'

interface DivisionBreakdownProps {
  matches: Match[]
}

function getBeltSkillCategory(beltLevel: string | null | undefined): string {
  if (!beltLevel) return 'Unknown'
  const belt = beltLevel.toLowerCase()
  
  if (belt.includes('white') || belt.includes('orange')) return 'Beginner'
  if (belt.includes('yellow') || belt.includes('green') || belt.includes('blue')) return 'Novice I'
  if (belt.includes('red') || belt.includes('brown')) return 'Novice II'
  if (belt.includes('black') || belt.includes('poom') || belt.includes('dan')) return 'Advanced'
  
  return 'Unknown'
}

const SKILL_ORDER = ['Beginner', 'Novice I', 'Novice II', 'Advanced', 'Unknown']
const ITEMS_PER_PAGE = 5

export function DivisionBreakdown({ matches }: DivisionBreakdownProps) {
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate Stats
  const divisionStats: Record<string, { 
    players: Set<string>, 
    matches: number,
    rows: Map<string, { category: string, skill: string, playerCount: Set<string>, matchCount: number, completedCount: number }>
  }> = {}

  if (matches.length > 0) {
    matches.forEach((match: any) => {
      const divName = match.tournament_divisions?.name || 'Unknown'
      const catName = match.tournament_categories?.name || 'Unassigned'
      
      const p1Belt = match.player1?.belt_level
      const skill = getBeltSkillCategory(p1Belt)
      
      if (!divisionStats[divName]) {
        divisionStats[divName] = { players: new Set(), matches: 0, rows: new Map() }
      }
      
      if (match.player1_id) divisionStats[divName].players.add(match.player1_id)
      if (match.player2_id) divisionStats[divName].players.add(match.player2_id)
      divisionStats[divName].matches++
      
      const rowKey = `${catName}-${skill}`
      if (!divisionStats[divName].rows.has(rowKey)) {
        divisionStats[divName].rows.set(rowKey, {
          category: catName,
          skill: skill,
          playerCount: new Set(),
          matchCount: 0,
          completedCount: 0
        })
      }
      
      const row = divisionStats[divName].rows.get(rowKey)!
      if (match.player1_id) row.playerCount.add(match.player1_id)
      if (match.player2_id) row.playerCount.add(match.player2_id)
      row.matchCount++
      if (match.status === 'completed') row.completedCount++
    })
  }

  const sortedDivisionNames = Object.keys(divisionStats).sort()
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
                .filter(r => skillFilter === 'all' || r.skill.toLowerCase() === skillFilter.toLowerCase())
                // Sort by Skill Order first, then Category
                .sort((a, b) => {
                    const skillDiff = SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill)
                    if (skillDiff !== 0) return skillDiff
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
                    <Select value={skillFilter} onValueChange={(val) => {
                        setSkillFilter(val)
                        setCurrentPage(1)
                    }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Skill" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Skills</SelectItem>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Novice I">Novice I</SelectItem>
                        <SelectItem value="Novice II">Novice II</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Category</TableHead>
                        <TableHead>Skill Level</TableHead>
                        <TableHead className="text-right">Players</TableHead>
                        <TableHead className="w-[180px]">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No data matching filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRows.map((row, idx) => {
                          const rowProgress = row.matchCount > 0 ? Math.round((row.completedCount / row.matchCount) * 100) : 0
                          const matchesLeft = row.matchCount - row.completedCount
                          
                          return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{row.category}</TableCell>
                            <TableCell>
                              <span className={cn(
                                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset",
                                  row.skill === 'Advanced' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                                  row.skill === 'Beginner' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                  row.skill.startsWith('Novice') ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                  'bg-gray-50 text-gray-600 ring-gray-500/10'
                              )}>
                                {row.skill}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{row.playerCount.size}</TableCell>
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
