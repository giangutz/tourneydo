"use client"

import { useMemo } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartConfig = {
  actual: {
    label: "Actual",
    color: "hsl(var(--primary))",
  },
  planned: {
    label: "Planned",
    color: "hsl(var(--muted))",
  },
} satisfies ChartConfig

export function MatchPaceChart({ matches }: { matches: any[] }) {
  // Mock data generation based on matches
  // Real implementation: bucket completed matches by hour
  const data = [
    { hour: "9am", planned: 20, actual: 18 },
    { hour: "10am", planned: 45, actual: 40 },
    { hour: "11am", planned: 80, actual: 85 },
    { hour: "12pm", planned: 110, actual: 115 },
    { hour: "1pm", planned: 140, actual: 138 },
    { hour: "2pm", planned: 170, actual: 160 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Pace Over Time</CardTitle>
        <CardDescription>Matches completed per hour vs. schedule</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
               tickLine={false}
               axisLine={false}
               tickMargin={8}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="planned"
              type="monotone"
              stroke="var(--color-planned)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              dataKey="actual"
              type="monotone"
              stroke="var(--color-actual)"
              strokeWidth={2}
              dot={{
                r: 4,
                fill: "var(--color-actual)",
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
