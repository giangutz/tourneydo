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
  const filteredDivisions = divisions.map(div => ({
    ...div,
    tournament_categories: div.tournament_categories.filter(cat => {
      if (filterGender === 'all') return true
      if (filterGender === 'male') return cat.gender === 'male' || cat.gender === 'both'
      if (filterGender === 'female') return cat.gender === 'female' || cat.gender === 'both'
      return true
    })
  }))

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
          const enabledCategories = division.tournament_categories.length
          
          return (
            <AccordionItem key={division.id} value={division.id} className="border rounded-lg group">
              <Card className={!division.enabled ? 'opacity-60' : ''}>
                <div className="flex items-center justify-between w-full pr-4 py-4">
                    <AccordionTrigger className="hover:no-underline py-0 pr-0 flex-1 [&>svg]:hidden">
                      <div className="text-left pl-6">
                        <CardTitle className="text-lg">{division.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          Ages: {division.min_age || '0'} - {division.max_age || '∞'} • {enabledCategories} categories
                        </CardDescription>
                      </div>
                    </AccordionTrigger>
                    
                    <div className="flex items-center gap-3 pl-4 pr-2">
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <Badge variant={division.enabled ? 'default' : 'secondary'}>
                          {division.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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

                        <div className="h-6 w-px bg-border mx-1" />
                      </div>

                      <AccordionTrigger className="flex-none h-8 w-8 p-0 hover:bg-muted hover:no-underline rounded-md justify-center [&>svg]:size-5 [&>svg]:text-foreground">
                      </AccordionTrigger>
                    </div>
                  </div>
                
                <AccordionContent>
                  <CardContent className="pt-4 space-y-4">
                    {/* ... existing content ... */}
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        {measurementType === 'height' ? <Ruler className="h-4 w-4" /> : <Weight className="h-4 w-4" />}
                        Categories ({measurementType === 'height' ? 'Height-based' : 'Weight-based'})
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
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

// Category Card Component
function CategoryCard({ 
  category, 
  divisionName, 
  measurementType, 
  onEdit, 
  onDelete, 
  getGenderLabel 
}: {
  category: Category
  divisionName: string
  measurementType: 'height' | 'weight'
  onEdit: () => void
  onDelete: () => void
  getGenderLabel: (divisionName: string, gender: 'male' | 'female' | 'both') => string
}) {
  const formatLimit = (value: number | null, isMax: boolean) => {
    if (value === null) return isMax ? '∞' : '0'
    return `${value}${measurementType === 'height' ? 'cm' : 'kg'}`
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{category.name}</span>
          <Badge variant="outline" className="text-xs">
            {getGenderLabel(divisionName, category.gender)}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {measurementType === 'height' ? (
            <span>{formatLimit(category.min_height, false)} - {formatLimit(category.max_height, true)}</span>
          ) : (
            <span>{formatLimit(category.min_weight, false)} - {formatLimit(category.max_weight, true)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

// Category Edit Dialog Component
function CategoryEditDialog({
  category,
  divisionName,
  measurementType,
  isSubmitting,
  onSave,
  onClose
}: {
  category: Category
  divisionName: string
  measurementType: 'height' | 'weight'
  isSubmitting: boolean
  onSave: (categoryId: string, data: { name: string } & Partial<Category>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(category.name)
  const [minValue, setMinValue] = useState(
    measurementType === 'height' ? category.min_height : category.min_weight
  )
  const [maxValue, setMaxValue] = useState(
    measurementType === 'height' ? category.max_height : category.max_weight
  )

  const handleSave = () => {
    const limits = measurementType === 'height'
      ? { min_height: minValue, max_height: maxValue }
      : { min_weight: minValue, max_weight: maxValue }
    
    onSave(category.id, { name, ...limits })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category: {category.name}</DialogTitle>
          <DialogDescription>
            Update the name and {measurementType} limits for this category
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Category Name</Label>
             <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Heavyweight"
            />
          </div>
          <div>
            <Label>Minimum {measurementType === 'height' ? 'Height (cm)' : 'Weight (kg)'}</Label>
            <Input
              type="number"
              step="0.1"
              value={minValue || ''}
              onChange={(e) => setMinValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="No minimum"
            />
          </div>
          <div>
            <Label>Maximum {measurementType === 'height' ? 'Height (cm)' : 'Weight (kg)'}</Label>
            <Input
              type="number"
              step="0.1"
              value={maxValue || ''}
              onChange={(e) => setMaxValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="No maximum"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Add Category Dialog Component
function AddCategoryDialog({
  divisionId,
  divisionName,
  measurementType,
  isSubmitting,
  onAdd,
  onClose
}: {
  divisionId: string
  divisionName: string
  measurementType: 'height' | 'weight'
  isSubmitting: boolean
  onAdd: (divisionId: string, category: Omit<Category, 'id'>) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [minValue, setMinValue] = useState<number | null>(null)
  const [maxValue, setMaxValue] = useState<number | null>(null)

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Category name is required')
      return
    }

    const category = {
      name: name.trim(),
      gender,
      ...(measurementType === 'height'
        ? { min_height: minValue, max_height: maxValue, min_weight: null, max_weight: null }
        : { min_weight: minValue, max_weight: maxValue, min_height: null, max_height: null }
      )
    }

    onAdd(divisionId, category)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Category to {divisionName}</DialogTitle>
          <DialogDescription>
            Create a new {measurementType}-based category
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Category Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Super Heavy"
            />
          </div>
          <div>
            <Label>Gender</Label>
            <select
              className="w-full border rounded-md p-2"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            >
              <option value="male">{divisionName.toLowerCase().includes('gradeschool') || divisionName.toLowerCase().includes('cadet') ? 'Boys' : 'Men'}</option>
              <option value="female">{divisionName.toLowerCase().includes('gradeschool') || divisionName.toLowerCase().includes('cadet') ? 'Girls' : 'Women'}</option>
            </select>
          </div>
          <div>
            <Label>Minimum {measurementType === 'height' ? 'Height (cm)' : 'Weight (kg)'}</Label>
            <Input
              type="number"
              step="0.1"
              value={minValue || ''}
              onChange={(e) => setMinValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="No minimum"
            />
          </div>
          <div>
            <Label>Maximum {measurementType === 'height' ? 'Height (cm)' : 'Weight (kg)'}</Label>
            <Input
              type="number"
              step="0.1"
              value={maxValue || ''}
              onChange={(e) => setMaxValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="No maximum"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Division Dialog Component
function DivisionDialog({
  division,
  isSubmitting,
  onSave,
  onClose
}: {
  division: Division | null
  isSubmitting: boolean
  onSave: (data: { name: string; min_age?: number | null; max_age?: number | null }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(division?.name || '')
  const [minAge, setMinAge] = useState<number | null>(division?.min_age || null)
  const [maxAge, setMaxAge] = useState<number | null>(division?.max_age || null)

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Division name is required')
      return
    }
    onSave({ name: name.trim(), min_age: minAge, max_age: maxAge })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{division ? 'Edit Division' : 'Create New Division'}</DialogTitle>
          <DialogDescription>
            {division ? 'Update division details' : 'Define a new division and its age requirements'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Division Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ultra Heavy"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Min Age (Optional)</Label>
              <Input
                type="number"
                value={minAge || ''}
                onChange={(e) => setMinAge(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No min"
              />
            </div>
            <div className="grid gap-2">
              <Label>Max Age (Optional)</Label>
              <Input
                type="number"
                value={maxAge || ''}
                onChange={(e) => setMaxAge(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No max"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (division ? 'Update Division' : 'Create Division')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
