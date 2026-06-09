"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface UnpaidTeam {
  teamId: string
  teamName: string
  amountOwed: number
}

interface PaymentDialogProps {
  tournamentId: string
  coachId: string
  unpaidTeams: UnpaidTeam[]
}

export function PaymentDialog({ 
  tournamentId, 
  coachId, 
  unpaidTeams
}: PaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // State for selected team
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      reference_number: "",
    },
  })

  // Auto-select if only one team
  useEffect(() => {
    if (unpaidTeams.length === 1) {
      setSelectedTeamId(unpaidTeams[0].teamId)
      form.setValue('amount', unpaidTeams[0].amountOwed.toString())
    } else {
        // Reset if multiple teams (user must select)
        setSelectedTeamId("")
        form.setValue('amount', "")
    }
  }, [unpaidTeams, form, open])

  // Update amount when team selection changes
  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId)
    const team = unpaidTeams.find(t => t.teamId === teamId)
    if (team) {
      form.setValue('amount', team.amountOwed.toString())
    }
  }

  const selectedTeamData = unpaidTeams.find(t => t.teamId === selectedTeamId)


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedTeamId) {
        toast.error("Please select a team")
        return
    }

    setIsSubmitting(true)
    
    const path = `/dashboard/coach/tournaments`
    
    try {
      const result = await submitPaymentAction({
        tournament_id: tournamentId,
        team_id: selectedTeamId,
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
      toast.error("Submission Failed", {
        description: "An error occurred while submitting your payment.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (unpaidTeams.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white flex-1">
          <CreditCard className="mr-2 h-4 w-4" />
          Make Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit Payment</DialogTitle>
          <DialogDescription>
            Select a team and submit payment details for verification.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
            {/* Team Selection */}
            {unpaidTeams.length > 1 && (
                <div className="space-y-2">
                    <Label>Select Team</Label>
                     <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                        <SelectTrigger>
                        <SelectValue placeholder="Select team to pay for" />
                        </SelectTrigger>
                        <SelectContent>
                        {unpaidTeams.map((team) => (
                            <SelectItem key={team.teamId} value={team.teamId}>
                            {team.teamName} (₱{team.amountOwed})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {selectedTeamData && (
                 <div className="bg-muted/50 p-4 rounded-lg text-center border border-muted">
                    <div className="text-sm text-muted-foreground uppercase tracking-wide font-semibold text-xs">Total Pending Amount</div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(selectedTeamData.amountOwed)}
                    </div>
                </div>
            )}

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
                <Button type="submit" disabled={isSubmitting || !selectedTeamId}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for Verification
                </Button>
                </DialogFooter>
            </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
