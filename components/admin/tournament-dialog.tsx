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
import { createTournament, updateTournament } from '@/app/actions/admin'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const tournamentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  date: z.string().min(1, 'Date is required'),
  venue: z.string().min(3, 'Venue is required'),
  fees: z.coerce.number().min(0),
  registration_deadline: z.string().min(1, 'Deadline is required'),
  status: z.enum(['upcoming', 'registration_open', 'registration_closed', 'live', 'completed']).optional(),
})

interface TournamentDialogProps {
  tournament?: any
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TournamentDialog({ tournament, trigger, open, onOpenChange }: TournamentDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof tournamentSchema>>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      title: tournament?.title || '',
      date: tournament?.date || '',
      venue: tournament?.venue || '',
      fees: tournament?.fees || 0,
      registration_deadline: tournament?.registration_deadline ? new Date(tournament.registration_deadline).toISOString().slice(0, 16) : '',
      status: tournament?.status || 'upcoming',
    },
  })

  const onSubmit = async (values: z.infer<typeof tournamentSchema>) => {
    setIsLoading(true)
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value.toString())
    })

    try {
      if (tournament) {
        await updateTournament(tournament.id, formData)
      } else {
        await createTournament(formData)
      }
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tournament ? 'Edit Tournament' : 'Create Tournament'}</DialogTitle>
          <DialogDescription>
            {tournament
              ? 'Update tournament details.'
              : 'Create a new tournament event.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Winter Championship" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registration_deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reg. Deadline</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="City Sports Hall" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Fee ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {tournament && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="registration_open">Reg. Open</SelectItem>
                          <SelectItem value="registration_closed">Reg. Closed</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tournament ? 'Save Changes' : 'Create Tournament'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
