"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { submitPaymentAction } from "@/lib/actions/payments"
import { toast } from "sonner"
import { Loader2, CreditCard } from "lucide-react"

const formSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  reference_number: z.string().min(3, "Reference number/code is required"),
})

interface PaymentDialogProps {
  tournamentId: string
  teamId: string
  coachId: string
  amountOwed: number
  teamName: string
}

export function PaymentDialog({ 
  tournamentId, 
  teamId, 
  coachId, 
  amountOwed,
  teamName
}: PaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // const { toast } = useToast() // Removed

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: amountOwed.toString(),
      reference_number: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    
    const path = `/dashboard/coach/tournaments`
    console.log(tournamentId, teamId, coachId)
    
    try {
      const result = await submitPaymentAction({
        tournament_id: tournamentId,
        team_id: teamId,
        coach_id: coachId,
        amount: Number(values.amount),
        reference_number: values.reference_number
      }, path)

      if (result.success) {
        toast.success("Payment Submitted", {
          description: "Your proof of payment has been sent for verification.",
        })
        setOpen(false)
        form.reset()
      } else {
        toast.error("Submission Failed", {
          description: result.error || "An error occurred while submitting your payment.",
        })
      }
    } catch (error) {
      console.error("Error submitting payment:", error)
      toast.error("Submission Failed", {
        description: "An error occurred while submitting your payment.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <CreditCard />
          Submit Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit Payment for {teamName}</DialogTitle>
          <DialogDescription>
            Complete your registration by submitting payment details. Your reference number is required for verification.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 p-4 rounded-lg mb-4 text-center border border-muted">
             <div className="text-sm text-muted-foreground uppercase tracking-wide font-semibold text-xs">Total Pending Amount</div>
             <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amountOwed)}
             </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. GCash Ref: 123456789" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Please upload proof of payment via reference code. This is required for organizer verification.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit for Verification
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
