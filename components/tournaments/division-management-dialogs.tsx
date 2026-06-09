'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Edit2, Weight } from 'lucide-react'
import { toast } from 'sonner'
import {
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

// Category Card Component
export function CategoryCard({ 
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-muted/30 gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium break-all">{category.name}</span>
          <Badge variant="outline" className="text-xs shrink-0">
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
      <div className="flex items-center gap-2 self-end sm:self-auto">
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
export function CategoryEditDialog({
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
        <div className="space-y-6 py-4">
          <div className="grid gap-3">
            <Label>Category Name</Label>
             <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Heavyweight"
            />
          </div>
          <div className="grid gap-3">
            <Label>Minimum {measurementType === 'height' ? 'Height (cm)' : 'Weight (kg)'}</Label>
            <Input
              type="number"
              step="0.1"
              value={minValue || ''}
              onChange={(e) => setMinValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="No minimum"
            />
          </div>
          <div className="grid gap-3">
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
        <DialogFooter className="gap-2 sm:gap-0">
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
export function AddCategoryDialog({
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
      <DialogContent className="sm:max-w-[425px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Category to {divisionName}</DialogTitle>
          <DialogDescription>
            Create a new {measurementType}-based category
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid gap-3">
            <Label>Category Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Super Heavy"
            />
          </div>
          <div className="grid gap-3">
            <Label>Gender</Label>
            <select
              className="w-full border rounded-md p-2 bg-background"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            >
              <option value="male">{divisionName.toLowerCase().includes('gradeschool') || divisionName.toLowerCase().includes('cadet') ? 'Boys' : 'Men'}</option>
              <option value="female">{divisionName.toLowerCase().includes('gradeschool') || divisionName.toLowerCase().includes('cadet') ? 'Girls' : 'Women'}</option>
            </select>
          </div>
          <div className="grid gap-3">
            <Label>Minimum {measurementType === 'height' ? 'Height (cm)' : 'Weight (kg)'}</Label>
            <Input
              type="number"
              step="0.1"
              value={minValue || ''}
              onChange={(e) => setMinValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="No minimum"
            />
          </div>
          <div className="grid gap-3">
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
        <DialogFooter className="flex-col gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Adding...' : 'Add Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Division Dialog Component
export function DivisionDialog({
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
        <div className="space-y-6 py-4">
          <div className="grid gap-3">
            <Label>Division Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ultra Heavy"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-3">
              <Label>Min Age (Optional)</Label>
              <Input
                type="number"
                value={minAge || ''}
                onChange={(e) => setMinAge(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No min"
              />
            </div>
            <div className="grid gap-3">
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
        <DialogFooter className="gap-2 sm:gap-0">
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
