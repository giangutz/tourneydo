'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Trash2, Edit2, Users, Weight, Ruler, MoreVertical, ChevronDown, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  updateDivisionStatus,
  updateCategoryLimits,
  updateCategoryName,
  createCustomCategory,
  deleteCategory,
  createDivision,
  updateDivision,
  deleteDivision
} from '@/lib/actions/divisions'
import { CategoryCard, CategoryEditDialog, AddCategoryDialog, DivisionDialog } from './division-management-dialogs'

interface Category {
  id: string
  name: string
  gender: 'male' | 'female' | 'both'
  min_weight: number | null
  max_weight: number | null
  min_height: number | null
  max_height: number | null
}

interface Division {
  id: string
  name: string
  min_age: number | null
  max_age: number | null
  enabled: boolean
  tournament_categories: Category[]
}

interface DivisionManagementProps {
  tournamentId: string
  divisions: Division[]
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ... types and props ...

export function DivisionManagement({ tournamentId, divisions: initialDivisions }: DivisionManagementProps) {
  const [divisions, setDivisions] = useState<Division[]>(initialDivisions)
  const [editingCategory, setEditingCategory] = useState<{ divisionId: string; category: Category } | null>(null)
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  
  // Division state
  const [addingDivision, setAddingDivision] = useState(false)
  const [editingDivision, setEditingDivision] = useState<Division | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all')

  // Filter divisions to show only categories matching the filter
  const filteredDivisions = divisions.map(div => {
    const measurementType = div.name.toLowerCase().includes('gradeschool') ? 'height' : 'weight'
    
    return {
      ...div,
      tournament_categories: div.tournament_categories
        .filter(cat => {
          if (filterGender === 'all') return true
          if (filterGender === 'male') return cat.gender === 'male' || cat.gender === 'both'
          if (filterGender === 'female') return cat.gender === 'female' || cat.gender === 'both'
          return true
        })
        .sort((a, b) => {
          // 1. Sort by Gender (Male/Both first, then Female)
          const genderOrder = { 'male': 1, 'both': 2, 'female': 3 }
          const genderDiff = (genderOrder[a.gender] || 99) - (genderOrder[b.gender] || 99)
          if (genderDiff !== 0) return genderDiff

          // 2. Sort by Size (Min value ascending)
          const getVal = (c: Category, type: 'height' | 'weight') => {
             return (type === 'height' ? c.min_height : c.min_weight) ?? -Infinity
          }
          
          const valA = getVal(a, measurementType)
          const valB = getVal(b, measurementType)
          
          if (valA !== valB) {
            return valA - valB
          }

          // 3. Fallback: Sort by Max Value
          const getMax = (c: Category, type: 'height' | 'weight') => {
              return (type === 'height' ? c.max_height : c.max_weight) ?? Infinity
          }
          const maxA = getMax(a, measurementType)
          const maxB = getMax(b, measurementType)
          
          if (maxA !== maxB) {
            return maxA - maxB
          }

          // 4. Fallback: Natural Name Sort (Group 1, Group 2, Group 10)
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        })
    }
  })

  const handleToggleDivision = async (divisionId: string, enabled: boolean) => {
    const result = await updateDivisionStatus(tournamentId, divisionId, enabled)
    if (result.success) {
      setDivisions(prev => prev.map(d => d.id === divisionId ? { ...d, enabled } : d))
      toast.success(`Division ${enabled ? 'enabled' : 'disabled'}`)
    } else {
      toast.error('Failed to update division')
    }
  }

  const handleUpdateCategory = async (categoryId: string, data: { name: string } & Partial<Category>) => {
    setIsSubmitting(true)
    
    // Execute updates in parallel for efficiency
    const promises = []
    
    // Always update limits
    promises.push(updateCategoryLimits(tournamentId, categoryId, {
      min_weight: data.min_weight,
      max_weight: data.max_weight,
      min_height: data.min_height,
      max_height: data.max_height
    }))

    // Update name if changed (or just always update to be safe/simple)
    promises.push(updateCategoryName(tournamentId, categoryId, data.name))

    const results = await Promise.all(promises)
    const allSuccess = results.every(r => r.success)
    
    setIsSubmitting(false)

    if (allSuccess) {
      setDivisions(prev => prev.map(d => ({
        ...d,
        tournament_categories: d.tournament_categories.map(c =>
          c.id === categoryId ? { ...c, ...data } : c
        )
      })))
      setEditingCategory(null)
      toast.success('Category updated')
    } else {
      toast.error('Failed to update category')
    }
  }

  const handleUpdateCategoryName = async (categoryId: string, name: string) => {
    const result = await updateCategoryName(tournamentId, categoryId, name)
    if (result.success) {
      setDivisions(prev => prev.map(d => ({
        ...d,
        tournament_categories: d.tournament_categories.map(c =>
          c.id === categoryId ? { ...c, name } : c
        )
      })))
      toast.success('Category name updated')
    } else {
      toast.error('Failed to update category name')
    }
  }

  const handleAddCategory = async (divisionId: string, category: Omit<Category, 'id'>) => {
    setIsSubmitting(true)
    const result = await createCustomCategory(tournamentId, divisionId, category)
    setIsSubmitting(false)

    if (result.success && result.data) {
      setDivisions(prev => prev.map(d =>
        d.id === divisionId
          ? { ...d, tournament_categories: [...d.tournament_categories, result.data] }
          : d
      ))
      setAddingCategory(null)
      toast.success('Category added')
    } else {
      toast.error('Failed to add category')
    }
  }

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ 
    type: 'division' | 'category'
    id: string
    name: string
    divisionId?: string 
  } | null>(null)

  // ... existing handlers ...

  const handleDeleteCategory = async (divisionId: string, categoryId: string) => {
    // Find category name for display
    const division = divisions.find(d => d.id === divisionId)
    const category = division?.tournament_categories.find(c => c.id === categoryId)
    
    setDeleteConfirmation({
      type: 'category',
      id: categoryId,
      name: category?.name || 'Category',
      divisionId
    })
  }

  const confirmDeleteCategory = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'category' || !deleteConfirmation.divisionId) return
    
    const { id, divisionId } = deleteConfirmation
    const result = await deleteCategory(tournamentId, id)
    
    if (result.success) {
      setDivisions(prev => prev.map(d =>
        d.id === divisionId
          ? { ...d, tournament_categories: d.tournament_categories.filter(c => c.id !== id) }
          : d
      ))
      toast.success('Category deleted')
    } else {
      toast.error('Cannot delete category with assigned participants')
    }
    setDeleteConfirmation(null)
  }

  const handleDeleteDivision = async (division: Division) => {
    setDeleteConfirmation({
      type: 'division',
      id: division.id,
      name: division.name
    })
  }

  const confirmDeleteDivision = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'division') return

    const { id, name } = deleteConfirmation
    const result = await deleteDivision(tournamentId, id)
    
    if (result.success) {
      setDivisions(prev => prev.filter(d => d.id !== id))
      toast.success('Division deleted')
    } else {
      toast.error('Cannot delete division with assigned participants')
    }
    setDeleteConfirmation(null)
  }

  // Division Handlers
  const handleAddDivision = async (data: { name: string; min_age?: number | null; max_age?: number | null }) => {
    setIsSubmitting(true)
    const result = await createDivision(tournamentId, data)
    setIsSubmitting(false)

    if (result.success && result.data) {
      setDivisions(prev => [...prev, result.data].sort((a, b) => (a.min_age || 0) - (b.min_age || 0)))
      setAddingDivision(false)
      toast.success('Division created')
    } else {
      toast.error('Failed to create division')
    }
  }

  const handleUpdateDivision = async (data: { name: string; min_age?: number | null; max_age?: number | null }) => {
    if (!editingDivision) return
    setIsSubmitting(true)
    const result = await updateDivision(tournamentId, editingDivision.id, data)
    setIsSubmitting(false)

    if (result.success) {
      setDivisions(prev => prev.map(d => d.id === editingDivision.id ? { ...d, ...data } : d).sort((a, b) => (a.min_age || 0) - (b.min_age || 0)))
      setEditingDivision(null)
      toast.success('Division updated')
    } else {
      toast.error('Failed to update division')
    }
  }

  const getGenderLabel = (divisionName: string, gender: 'male' | 'female' | 'both') => {
    const isYouth = divisionName.toLowerCase().includes('gradeschool') || divisionName.toLowerCase().includes('cadet')
    if (gender === 'male') return isYouth ? 'Boys' : 'Men'
    if (gender === 'female') return isYouth ? 'Girls' : 'Women'
    return 'Both'
  }

  const getMeasurementType = (divisionName: string) => {
    return divisionName.toLowerCase().includes('gradeschool') ? 'height' : 'weight'
  }

  return (
    <div className="space-y-6">
      {/* ... tabs ... */}
      
      <Accordion type="multiple" className="space-y-4">
        {filteredDivisions.map((division) => {
          const measurementType = getMeasurementType(division.name)
            const originalDivision = divisions.find(d => d.id === division.id)
            const enabledCategories = originalDivision?.tournament_categories.length || 0
          
            return (
            <AccordionItem key={division.id} value={division.id} className="border rounded-lg group">
              <Card className={!division.enabled ? 'opacity-60' : ''}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full pr-4 py-4 gap-2">
                    <AccordionTrigger className="hover:no-underline py-0 pr-0 flex-1 [&>svg]:hidden w-full">
                      <div className="text-left pl-6">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">{division.name}</CardTitle>
                          <Badge variant={division.enabled ? 'default' : 'secondary'} className="text-xs font-bold">
                            {division.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm mt-1">
                          Ages: {division.min_age || '0'} - {division.max_age || '∞'} • {enabledCategories} categories
                        </CardDescription>
                      </div>
                    </AccordionTrigger>
                    
                    <div className="flex items-center gap-1 pl-6 sm:pl-4 pr-2 w-full sm:w-auto justify-end">
                      <div className="flex items-center justify-center h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex items-center justify-center">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingDivision(division)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Division
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleDivision(division.id, !division.enabled)}>
                              {division.enabled ? <X className="h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                              {division.enabled ? 'Disable' : 'Enable'} Division
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteDivision(division)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Division
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <AccordionTrigger className="flex-none h-8 w-8 p-0 hover:bg-muted hover:no-underline rounded-md justify-center [&>svg]:size-4 [&>svg]:text-foreground items-center">
                      </AccordionTrigger>
                    </div>
                  </div>
                
                <AccordionContent>
                  <CardContent className="pt-4 space-y-4">
                    {/* ... existing content ... */}
                    <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        {measurementType === 'height' ? <Ruler className="h-4 w-4" /> : <Weight className="h-4 w-4" />}
                        Categories ({measurementType === 'height' ? 'Height-based' : 'Weight-based'})
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full xs:w-auto"
                        onClick={() => setAddingCategory(division.id)}
                        disabled={!division.enabled}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      {division.tournament_categories.map((category) => (
                        <CategoryCard
                          key={category.id}
                          category={category}
                          divisionName={division.name}
                          measurementType={measurementType}
                          onEdit={() => setEditingCategory({ divisionId: division.id, category })}
                          onDelete={() => handleDeleteCategory(division.id, category.id)}
                          getGenderLabel={getGenderLabel}
                        />
                      ))}
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
               This will permanently delete the <strong>{deleteConfirmation?.name}</strong> {deleteConfirmation?.type}.
               {deleteConfirmation?.type === 'division' && ' All categories within this division will also be deleted.'}
               <br/><br/>
               This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
               onClick={deleteConfirmation?.type === 'division' ? confirmDeleteDivision : confirmDeleteCategory}
               className="bg-destructive hover:bg-destructive/90"
            >
              Delete {deleteConfirmation?.type === 'division' ? 'Division' : 'Category'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ... other dialogs ... */}
      {editingCategory && (
        <CategoryEditDialog
          category={editingCategory.category}
          divisionName={divisions.find(d => d.id === editingCategory.divisionId)?.name || ''}
          measurementType={getMeasurementType(divisions.find(d => d.id === editingCategory.divisionId)?.name || '')}
          isSubmitting={isSubmitting}
          onSave={handleUpdateCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {/* Add Category Dialog */}
      {addingCategory && (
        <AddCategoryDialog
          divisionId={addingCategory}
          divisionName={divisions.find(d => d.id === addingCategory)?.name || ''}
          measurementType={getMeasurementType(divisions.find(d => d.id === addingCategory)?.name || '')}
          isSubmitting={isSubmitting}
          onAdd={handleAddCategory}
          onClose={() => setAddingCategory(null)}
        />
      )}

      {/* Add/Edit Division Dialog */}
      {(addingDivision || editingDivision) && (
        <DivisionDialog
          division={editingDivision}
          isSubmitting={isSubmitting}
          onSave={editingDivision ? handleUpdateDivision : handleAddDivision}
          onClose={() => {
            setAddingDivision(false)
            setEditingDivision(null)
          }}
        />
      )}
    </div>
  )
}

