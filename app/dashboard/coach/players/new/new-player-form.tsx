"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
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
import { createClerkSupabaseClient } from "@/lib/supabase/client"
import { useSession } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { TagsSelector, Tag } from "@/components/ui/tags-selector"
import { calculateAge } from "@/lib/utils"
import type { BeltLevel } from "@/types/models"

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

interface NewPlayerFormProps {
  availableTeams: Tag[]
}

export function NewPlayerForm({ availableTeams }: NewPlayerFormProps) {
  const { session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState<Tag[]>([])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      dob: "",
      gender: undefined,
      weight: "",
      height: "",
      belt_level: "",
    },
  })

  // Calculate age from DOB to determine which field to show
  const dob = form.watch('dob')
  const age = useMemo(() => {
    if (!dob) return null
    return calculateAge(dob)
  }, [dob])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!session) return

    setIsLoading(true)
    try {
      const supabase = createClerkSupabaseClient({ session })
      
      // 1. Create Player
      const { data: player, error: playerError } = await (supabase as any)
        .from("players")
        .insert({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          dob: values.dob || null,
          gender: values.gender,
          weight: values.weight ? parseFloat(values.weight) : null,
          height: values.height ? parseFloat(values.height) : null,
          belt_level: values.belt_level || null,
          coach_id: session.user.id,
        })
        .select()
        .single()

      if (playerError) throw playerError

      // 2. Assign to Teams
      if (selectedTeams.length > 0 && player) {
        const teamAssignments = selectedTeams.map(team => ({
          team_id: team.id,
          player_id: player.id
        }))

        const { error: assignmentError } = await (supabase as any)
          .from("team_players")
          .insert(teamAssignments)

        if (assignmentError) throw assignmentError
      }

      router.push("/dashboard/coach/players")
    } catch (error) {
      console.error("Error creating player:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add New Player</CardTitle>
          <CardDescription>
            Register a new athlete to your roster and assign them to teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

              <div className="space-y-2">
                <FormLabel>Assign Teams</FormLabel>
                <TagsSelector 
                  tags={availableTeams} 
                  selectedTags={selectedTeams} 
                  onTagsChange={setSelectedTeams} 
                />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Player
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
