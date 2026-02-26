'use client'

import { 
  Table, 
  TableBody, 
 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

// Types for props (simplified from models)
interface Participant {
  id: string
  first_name: string
  last_name: string
  team_name?: string
  division_id?: string
  category_id?: string
  weigh_in_selected: boolean
  // Official weigh-in (read-only here — not used for random list status)
  weighed_in_at: string | null
  disqualified: boolean
  disqualification_reason: string | null
  actual_weight: number | null
  actual_height: number | null
  // Random (surprise) weigh-in — source of truth for this list's status
  random_weigh_in_weight: number | null
  random_weigh_in_at: string | null
  random_weigh_in_passed: boolean | null  // null = pending, true = passed, false = failed
  random_weigh_in_by: string | null
  player?: {
    first_name: string
    last_name: string
  }
  team?: {
    name: string
  }
  status?: string
}

interface Division {
  id: string
  name: string
  tournament_categories: Category[]
}

type Category = {
  id: string
  name: string
  gender: string
  max_weight?: number | null
  min_weight?: number | null
  max_height?: number | null
  min_height?: number | null
}

interface WeighInListProps {
  participants: Participant[] 
  divisions: Division[]
  tournamentId: string
  page: number
  totalPages: number
  totalCount: number
}

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Download, Trash2, Search, ArrowLeft, ArrowRight, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteWeighInChecklist } from '@/lib/actions/participants'

export function WeighInList({ participants, divisions, tournamentId, page, totalPages, totalCount }: WeighInListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isExporting, setIsExporting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)


  // URL State management
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '')
  const [debouncedQuery] = useDebounce(searchQuery, 300)
  const statusFilter = searchParams.get('status') || 'all'
  const divisionFilter = searchParams.get('divisionId') || 'all'
  const categoryFilter = searchParams.get('categoryId') || 'all'

  // Sync debounced search to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedQuery) {
      params.set('query', debouncedQuery)
    } else {
      params.delete('query')
    }
    params.set('page', '1') // Reset page on search
    router.replace(`${pathname}?${params.toString()}`)
  }, [debouncedQuery, pathname, router, searchParams])

  // Update Filters
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset category if division changes
    if (key === 'divisionId') {
      params.delete('categoryId')
    }
    params.set('page', '1')
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  // Get categories for current division filter
  const activeDivision = divisions.find(d => d.id === divisionFilter)
  const availableCategories = activeDivision ? activeDivision.tournament_categories : []

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      // Import action dynamically
      const { exportParticipants } = await import('@/lib/actions/participants')
       
      const filters = {
        weighInSelected: true,
        limit: 10000 
      }

      const result = await exportParticipants(tournamentId, filters)
       
      if (result.success) {
        if (result.data) {
          // Convert to CSV
          const headers = ['First Name', 'Last Name', 'Team', 'Division', 'Category', 'Max Weight', 'Status', 'Weigh-In Status', 'Actual Weight', 'Actual Height']
          const rows = result.data.map((p: Participant) => {
              const div = divisions.find((d: Division) => d.id === p.division_id)
              const cat = div?.tournament_categories.find((c: Category) => c.id === p.category_id)
              return [
                p.player?.first_name || '',
                p.player?.last_name || '',
                p.team?.name || '',
                div?.name || '',
                cat?.name || '',
                cat?.max_weight || 'Open',
                p.status,
                p.weighed_in_at ? 'Completed' : 'Pending',
                p.actual_weight || '',
                p.actual_height || ''
              ]
          })
            
          const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number | undefined)[]) => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
          ].join('\n')
            
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.setAttribute('href', url)
          link.setAttribute('download', `random_weigh_in_export_${new Date().toISOString().split('T')[0]}.csv`)
          link.style.visibility = 'hidden'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
            
          toast.success(`Exported ${rows.length} participants`)
        }
      } else {
        toast.error(result.error || 'Failed to export participants')
      }
    } catch (error) {
      toast.error('An error occurred during export', { description: (error as Error).message })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteList = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteWeighInChecklist(tournamentId)
      if (result.success) {
        toast.success("Weigh-in checklist deleted")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete checklist")
      }
    } catch (error) {
       console.error("Delete error:", error)
       toast.error("An unexpected error occurred")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  // Render format helper
  const getCategoryLabel = (cat: Category, divisionName: string) => {
    const isAdult = divisionName?.toLowerCase().includes('senior')
    let genderPrefix = ''
    
    if (cat.gender === 'male') {
        genderPrefix = isAdult ? 'Men' : 'Boys'
    } else if (cat.gender === 'female') {
        genderPrefix = isAdult ? 'Women' : 'Girls'
    }

     let label = cat.name
     if (genderPrefix) {
         label = `${genderPrefix} - ${label}`
     }
     if (cat.max_weight) {
        label += ` (Under ${cat.max_weight}kg)`
     } else if (cat.min_weight) {
        label += ` (Over ${cat.min_weight}kg)`
     } else if (cat.max_height) {
        label += ` (Under ${cat.max_height}cm)`
     }
     return label
  }

  const getCategoryDetails = (divisionId?: string, categoryId?: string) => {
    const div = divisions.find((d: Division) => d.id === divisionId)
    const cat = div?.tournament_categories.find((c: Category) => c.id === categoryId)
    return {
      divisionName: div?.name || 'Unknown',
      categoryName: cat ? getCategoryLabel(cat, div?.name ?? '') : 'Unknown', // Use same label format
      maxWeight: cat?.max_weight
    }
  }

  if (participants.length === 0 && !searchQuery && statusFilter === 'all' && divisionFilter === 'all') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Participants Selected</CardTitle>
          <CardDescription>
            Generate a random list to begin the surprise weigh-in checks.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                <div>
                  <CardTitle>Prescheduled Weigh-Ins</CardTitle>
                  <CardDescription>
                    Surprise check list for today. ({totalCount} participants)
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={isExporting || isDeleting}
                    className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete List
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting || isDeleting} className="flex-1 sm:flex-none">
                      {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                      {isExporting ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
                <div className="relative w-full sm:flex-1 min-w-[200px]">
                   <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                      placeholder="Search athlete..." 
                      className="pl-8 w-full" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
                
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto">
                  <Select value={statusFilter} onValueChange={(val) => updateFilter('status', val)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Passed/Completed</SelectItem> 
                      <SelectItem value="not-required">Failed/DQ</SelectItem> 
                    </SelectContent>
                  </Select>

                  <Select value={divisionFilter} onValueChange={(val) => updateFilter('divisionId', val)}>
                     <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Select Division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions
                          .filter(d => ['Cadet', 'Junior', 'Senior'].some(term => d.name.includes(term)))
                          .map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={(val) => updateFilter('categoryId', val)} disabled={divisionFilter === 'all'}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {(() => {
                          // Deduplicate categories by label
                          const uniqueCategories = new Map();
                          availableCategories.forEach((c: Category) => {
                               const label = getCategoryLabel(c, activeDivision?.name || '');
                               if (!uniqueCategories.has(label)) {
                                   uniqueCategories.set(label, c);
                               } else {
                                   const existing = uniqueCategories.get(label) as Category;
                                   if (!existing.max_weight && c.max_weight) {
                                       uniqueCategories.set(label, c);
                                   }
                               }
                           });
                           
                           return Array.from(uniqueCategories.values()).map((c: Category) => (
                              <SelectItem key={c.id} value={c.id}>
                                  {getCategoryLabel(c, activeDivision?.name || '')}
                              </SelectItem>
                          ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
            </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Desktop Table */}
        <div className="hidden lg:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Athlete</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Max Weight</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p: Participant) => {
                const details = getCategoryDetails(p.division_id, p.category_id)
                const fullName = p.player 
                  ? `${p.player.first_name} ${p.player.last_name}`
                  : `${p.first_name} ${p.last_name}`
                const teamName = p.team?.name || p.team_name || '-'

                let statusBadge = <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>
                if (p.random_weigh_in_passed === true) {
                  statusBadge = <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</Badge>
                } else if (p.random_weigh_in_passed === false) {
                  statusBadge = <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>
                }

                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{fullName}</div>
                      <div className="text-xs text-muted-foreground">{teamName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{details.divisionName}</div>
                      <div className="text-xs text-muted-foreground">{details.categoryName}</div>
                    </TableCell>
                    <TableCell>{statusBadge}</TableCell>
                    <TableCell className="text-right">
                      {details.maxWeight ? `${(details.maxWeight * 1.05).toFixed(2)}kg` : 'Open'}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.random_weigh_in_passed === null ? (
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/dashboard/tournament-organizer/tournaments/${tournamentId}/random-weigh-in/${p.id}`}>
                            <Scale className="h-4 w-4 mr-2" />
                            Random Check
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          title={p.random_weigh_in_passed ? 'Already passed' : 'Failed — disqualified (final)'}
                        >
                          <Scale className="h-4 w-4 mr-2" />
                          Random Check
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {participants.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                          No participants found matching your filters.
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {participants.length === 0 ? (
             <div className="text-center py-12 border rounded-lg bg-muted/10">
               <p className="text-muted-foreground">No participants found</p>
             </div>
          ) : (
             participants.map((p: Participant) => {
                const details = getCategoryDetails(p.division_id, p.category_id)
                const fullName = p.player 
                  ? `${p.player.first_name} ${p.player.last_name}`
                  : `${p.first_name} ${p.last_name}`
                const teamName = p.team?.name || p.team_name || '-'

                let statusBadge = <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>
                if (p.random_weigh_in_passed === true) {
                  statusBadge = <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</Badge>
                } else if (p.random_weigh_in_passed === false) {
                  statusBadge = <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>
                }

                return (
                  <div key={p.id} className="border rounded-lg bg-card p-4 space-y-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-base">{fullName}</div>
                        <div className="text-sm text-muted-foreground">{teamName}</div>
                      </div>
                      {statusBadge}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Division</span>
                        <span className="font-medium">{details.divisionName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Category</span>
                        <span className="font-medium">{details.categoryName}</span>
                      </div>
                       <div>
                        <span className="text-muted-foreground block text-xs">Max Weight (+5%)</span>
                        <span className="font-medium">{details.maxWeight ? `${(details.maxWeight * 1.05).toFixed(2)}kg` : 'Open'}</span>
                      </div>
                    </div>

                    {p.random_weigh_in_passed === null ? (
                      <Button variant="secondary" className="w-full" asChild>
                        <Link href={`/dashboard/tournament-organizer/tournaments/${tournamentId}/random-weigh-in/${p.id}`}>
                          <Scale className="h-4 w-4 mr-2" />
                          Random Check
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                        title={p.random_weigh_in_passed ? 'Already passed' : 'Failed — disqualified (final)'}
                      >
                        <Scale className="h-4 w-4 mr-2" />
                        Random Check
                      </Button>
                    )}
                  </div>
                )
             })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4 sm:gap-0">
                <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="flex-1 sm:flex-none"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="flex-1 sm:flex-none"
                    >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Weigh-in List?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all participants from the surprise weigh-in checklist. 
              Their actual weigh-in data (if completed) will be preserved.
              You can generate a new random list afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDeleteList()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete List"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
