'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDivision } from '@/app/actions/admin'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const divisionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age_min: z.coerce.number().min(0),
  age_max: z.coerce.number().min(0),
  weight_min: z.coerce.number().min(0),
  weight_max: z.coerce.number().min(0),
  belt_level: z.enum(['white', 'yellow', 'green', 'blue', 'red', 'black']),
  gender: z.enum(['male', 'female']),
})

interface DivisionDialogProps {
  tournamentId: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DivisionDialog({ tournamentId, trigger, open, onOpenChange }: DivisionDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof divisionSchema>>({
    resolver: zodResolver(divisionSchema),
    defaultValues: {
      name: '',
      age_min: 0,
      age_max: 99,
      weight_min: 0,
      weight_max: 999,
      belt_level: 'white',
      gender: 'male',
    },
  })

  const onSubmit = async (values: z.infer<typeof divisionSchema>) => {
    setIsLoading(true)
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value.toString())
    })

    try {
      await createDivision(tournamentId, formData)
      setIsOpen(false)
      onOpenChange?.(false)
      form.reset()
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
    if (!newOpen) {
      form.reset()
    }
  }

  return (
    <Dialog open={open ?? isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Division</DialogTitle>
          <DialogDescription>
            Create a new competition division.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Division Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Junior Male -48kg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="age_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Age</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Age</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weight_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Weight</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Weight</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="belt_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Belt Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select belt" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="yellow">Yellow</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="black">Black</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Division
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
