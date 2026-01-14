'use client'

import { useState, useTransition } from 'react'
import { startTransition } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
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
import { toast } from 'sonner'
import { submitWeighInResult } from '@/lib/actions/weigh-in'
import { Scale } from 'lucide-react'

const weighInSchema = z.object({
  weight: z.coerce.number().min(0, "Weight must be positive"),
  height: z.coerce.number().min(0, "Height must be positive").optional(),
})

interface WeighInDialogProps {
  registrationId: string
  participantName: string
  maxWeight?: number | null
  tournamentId: string
  currentWeight?: number | null
  currentHeight?: number | null
}

export function WeighInDialog({ 
  registrationId, 
  participantName, 
  maxWeight, 
  tournamentId,
  currentWeight,
  currentHeight
}: WeighInDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<z.infer<typeof weighInSchema>>({
    resolver: zodResolver(weighInSchema) as Resolver<z.infer<typeof weighInSchema>>,
    defaultValues: {
      weight: currentWeight || 0,
      height: currentHeight || 0,
    },
  })

  function onSubmit(values: z.infer<typeof weighInSchema>) {
    startTransition(async () => {
      const result = await submitWeighInResult(registrationId, values.weight, tournamentId, values.height)
      
      if (!result.success) {
        toast.error(result.message)
      } else {
        toast.success(result.message)
        setOpen(false)
      }
    })
  }

  const tolerance = maxWeight ? maxWeight * 0.05 : 0
  const limit = maxWeight ? maxWeight + tolerance : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Scale className="mr-2 h-4 w-4" />
          {currentWeight ? 'Re-Weigh' : 'Weigh In'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Weigh In - {participantName}</DialogTitle>
          <DialogDescription>
            Enter the measured weight (and height if needed) for the participant.
          </DialogDescription>
            {maxWeight && (
              <div className="mt-2 p-2 bg-muted rounded-md text-xs">
                <div>Max Weight: <span className="font-semibold">{maxWeight}kg</span></div>
                <div>Tolerance (+5%): <span className="font-semibold">{tolerance.toFixed(2)}kg</span></div>
                <div>Disqualification Limit: <span className="font-semibold text-destructive">{limit?.toFixed(2)}kg</span></div>
              </div>
            )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="Optional" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <span className="loading loading-spinner loading-xs mr-2"></span>}
                Submit Result
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
