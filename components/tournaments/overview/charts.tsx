"use client"

import { useMemo } from "react"
import { Bar, BarChart, LabelList, XAxis, YAxis, CartesianGrid, Label, Pie, PieChart } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Users, Award, VenetianMask } from "lucide-react"
import { ChartEmptyState } from "@/components/tournaments/shared/chart-empty-state"

// --- TYPES ---
interface Participant {
  id: string
  players: {
    belt_level: string | null
    gender: string | null
  }
  teams?: {
    name: string
  } | null
}

interface ChartsProps {
  participants: Participant[]
}

// --- TEAM DELEGATIONS CHART ---
const delegationsConfig = {
  count: {
    label: "Athletes",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function TeamDelegationsChart({ participants }: ChartsProps) {
  const data = useMemo(() => {
    const teamsMap = new Map<string, number>()
    
    participants.forEach(p => {
      const name = p.teams?.name || "Unattached"
      teamsMap.set(name, (teamsMap.get(name) || 0) + 1)
    })

    return Array.from(teamsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Top 5
  }, [participants])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Biggest Delegations</CardTitle>
        <CardDescription>Top 5 teams by number of athletes</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <ChartEmptyState
            icon={Users}
            message="No confirmed athletes yet. Team delegations will appear here once registrations are approved."
          />
        ) : (
        <ChartContainer config={delegationsConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ left: 16 }}
          >
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={100} // Give space for team names
              tick={{ fontSize: 12 }}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={5} barSize={24}>
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                className="fill-foreground font-bold"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// --- BELT LEVEL CHART ---
const beltConfig = {
  count: { label: "Athletes" },
  white: { label: "White", color: "#fff" },
  yellow: { label: "Yellow", color: "#fbbf24" }, // amber-400
  blue: { label: "Blue", color: "#3b82f6" },   // blue-500
  red: { label: "Red", color: "#ef4444" },    // red-500
  brown: { label: "Brown", color: "#78350f" },  // amber-900
  black: { label: "Black", color: "#000000" }, 
} satisfies ChartConfig

export function BeltDistributionChart({ participants }: ChartsProps) {
  const data = useMemo(() => {
    const beltsMap = new Map<string, number>()
    
    participants.forEach(p => {
      const belt = p.players.belt_level || "Unknown"
      beltsMap.set(belt, (beltsMap.get(belt) || 0) + 1)
    })

    const beltOrder = ['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black', 'Unknown']
    
    return beltOrder
      .filter(belt => beltsMap.get(belt)) // Only show existing belts
      .map(belt => {
        const configItem = beltConfig[belt.toLowerCase() as keyof typeof beltConfig]
        return {
          belt,
          count: beltsMap.get(belt) || 0,
          fill: (configItem && 'color' in configItem) ? configItem.color : "hsl(var(--muted))"
        }
      })
  }, [participants])

  const total = useMemo(() => data.reduce((acc, curr) => acc + curr.count, 0), [data])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Belt Distribution</CardTitle>
        <CardDescription>Athletes by skill level</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {total === 0 ? (
          <ChartEmptyState
            icon={Award}
            message="No confirmed athletes yet. Belt distribution will appear once registrations are approved."
          />
        ) : (
        <ChartContainer
          config={beltConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="belt"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Athletes
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// --- GENDER SPLIT CHART ---
const genderConfig = {
  male: { label: "Male", color: "#3b82f6" }, // blue-500
  female: { label: "Female", color: "#ec4899" }, // pink-500
} satisfies ChartConfig

export function GenderSplitChart({ participants }: ChartsProps) {
  const data = useMemo(() => {
    let male = 0
    let female = 0

    participants.forEach(p => {
      const g = p.players.gender?.toLowerCase()
      if (g === 'male') male++
      if (g === 'female') female++
    })

    return [
      { gender: "Male", count: male, fill: "var(--color-male)" },
      { gender: "Female", count: female, fill: "var(--color-female)" },
    ].filter(d => d.count > 0)
  }, [participants])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Gender Split</CardTitle>
        <CardDescription>Participant demographics</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {data.length === 0 ? (
          <ChartEmptyState
            icon={VenetianMask}
            message="No confirmed athletes yet. The gender split will appear once registrations are approved."
          />
        ) : (
        <ChartContainer
          config={genderConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="gender"
              innerRadius={60}
            />
             <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
