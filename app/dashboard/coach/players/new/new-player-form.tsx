"use client"

import { useState } from "react"
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
import { createClerkSupabaseClientBrowser } from "@/lib/supabase/client"
import { useSession } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { TagsSelector, Tag } from "@/components/ui/tags-selector"

const formSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().optional(),
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
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!session) return

    setIsLoading(true)
    try {
      const supabase = createClerkSupabaseClientBrowser(session)
      
      // 1. Create Player
      const { data: player, error: playerError } = await supabase
        .from("players")
        .insert({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          dob: values.dob || null,
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

        const { error: assignmentError } = await supabase
          .from("team_players")
          .insert(teamAssignments)

        if (assignmentError) throw assignmentError
      }

      router.push("/dashboard/coach/players")
      router.refresh()
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
                    <FormLabel>Email (Optional)</FormLabel>
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
                    <FormLabel>Date of Birth (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
