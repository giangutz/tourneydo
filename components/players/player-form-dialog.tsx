"use client"

import { useState, useMemo, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { calculateAge } from "@/lib/utils"
import type { BeltLevel, Player, Team } from "@/types/models"

const BELT_LEVELS: BeltLevel[] = ['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black']

const formSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required for division assignment"),
  weight: z.string().optional(),
  height: z.string().optional(),
  belt_level: z.string().min(1, "Belt level is required"),
  team_id: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.dob) return;
  const age = calculateAge(data.dob);

  if (age >= 12) {
    if (!data.weight || data.weight.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Weight is required for players 12 and older",
        path: ["weight"],
      });
    } else if (parseFloat(data.weight) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Weight cannot be negative",
        path: ["weight"],
      });
    }
  }

  if (age < 12) {
    if (!data.height || data.height.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Height is required for players under 12",
        path: ["height"],
      });
    } else if (parseFloat(data.height) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Height cannot be negative",
        path: ["height"],
      });
    }
  }
})

export type PlayerFormData = z.infer<typeof formSchema>

interface PlayerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  title: string
  description: string
  player?: Player
  teams?: Team[]
  selectedTeamId?: string
  showTeamSelector?: boolean
  onSubmit: (data: PlayerFormData) => Promise<void>
  submitButtonText?: string
}

export function PlayerFormDialog({
  open,
  onOpenChange,
  mode,
  title,
  description,
  player,
  teams = [],
  selectedTeamId,
  showTeamSelector = false,
  onSubmit,
  submitButtonText = mode === 'add' ? 'Add Player' : 'Update Player'
}: PlayerFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: player?.first_name || "",
      last_name: player?.last_name || "",
      email: player?.email || "",
      dob: player?.dob ? new Date(player.dob).toISOString().split('T')[0] : "",
      gender: player?.gender || undefined,
      weight: player?.weight?.toString() || "",
      height: player?.height?.toString() || "",
      belt_level: player?.belt_level || "",
      team_id: selectedTeamId || "",
    },
  })

  // Reset form when player changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        first_name: player?.first_name || "",
        last_name: player?.last_name || "",
        email: player?.email || "",
        dob: player?.dob ? new Date(player.dob).toISOString().split('T')[0] : "",
        gender: player?.gender || undefined,
        weight: player?.weight?.toString() || "",
        height: player?.height?.toString() || "",
        belt_level: player?.belt_level || "",
        team_id: selectedTeamId || "",
      })
    }
  }, [open, player, selectedTeamId, form])

  // Calculate age from DOB to determine which field to show
  const dob = form.watch('dob')
  const age = useMemo(() => {
    if (!dob) return null
    return calculateAge(dob)
  }, [dob])

  async function handleSubmit(values: PlayerFormData) {
    setIsLoading(true)
    try {
      await onSubmit(values)
      onOpenChange(false)
      form.reset()
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

            {showTeamSelector && teams.length > 0 && (
              <FormField
                control={form.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="belt_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Belt Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select belt level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BELT_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Weight/Height based on age */}
            {age !== null && age >= 12 && (
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="65.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {age !== null && age < 12 && (
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="150.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
