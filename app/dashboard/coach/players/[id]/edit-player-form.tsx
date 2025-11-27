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

interface EditPlayerFormProps {
  player: any
  availableTeams: Tag[]
  currentAssignments: Tag[]
}

export function EditPlayerForm({ player, availableTeams, currentAssignments }: EditPlayerFormProps) {
  const { session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState<Tag[]>(currentAssignments)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: player.first_name,
      last_name: player.last_name,
      email: player.email || "",
      dob: player.dob || "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!session) return

    setIsLoading(true)
    try {
      const supabase = createClerkSupabaseClientBrowser(session)
      
      // 1. Update Player Details
      const { error: updateError } = await supabase
        .from("players")
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          dob: values.dob || null,
        })
        .eq("id", player.id)

      if (updateError) throw updateError

      // 2. Update Team Assignments
      // Calculate added and removed teams
      const currentIds = currentAssignments.map(t => t.id)
      const selectedIds = selectedTeams.map(t => t.id)

      const addedTeams = selectedTeams.filter(t => !currentIds.includes(t.id))
      const removedTeams = currentAssignments.filter(t => !selectedIds.includes(t.id))

      // Insert added teams
      if (addedTeams.length > 0) {
        const toInsert = addedTeams.map(team => ({
          team_id: team.id,
          player_id: player.id
        }))
        const { error: insertError } = await supabase
          .from("team_players")
          .insert(toInsert)
        if (insertError) throw insertError
      }

      // Delete removed teams
      if (removedTeams.length > 0) {
        const toDeleteIds = removedTeams.map(t => t.id)
        const { error: deleteError } = await supabase
          .from("team_players")
          .delete()
          .eq("player_id", player.id)
          .in("team_id", toDeleteIds)
        if (deleteError) throw deleteError
      }

      router.refresh()
      // Optional: Show toast success
    } catch (error) {
      console.error("Error updating player:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Player</CardTitle>
          <CardDescription>
            Update player details and manage team assignments.
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
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
