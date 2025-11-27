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

const formSchema = z.object({
  name: z.string().min(2, "Tournament name is required"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

export default function NewTournamentPage() {
  const { session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      start_date: "",
      end_date: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!session) return

    setIsLoading(true)
    try {
      const supabase = createClerkSupabaseClientBrowser(async () => await session.getToken({ template: "supabase" }))
      
      const { error } = await supabase.from("tournaments").insert({
        name: values.name,
        organizer_id: session.user.id,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
      })

      if (error) throw error

      router.push("/dashboard/tournament-organizer/tournaments")
      router.refresh()
    } catch (error) {
      console.error("Error creating tournament:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Tournament</CardTitle>
          <CardDescription>
            Set up a new event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Championship 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Tournament
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
