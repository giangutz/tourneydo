"use client"

import { useMemo } from "react"
import { Pie, PieChart, Label } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface Participant {
  weighed_in_at: string | null
  status: string
}

const chartConfig = {
  cleared: { label: "Cleared", color: "hsl(var(--primary))" },
  pending: { label: "Pending", color: "hsl(var(--muted))" },
} satisfies ChartConfig

export function WeighInChart({ participants }: { participants: Participant[] }) {
  const data = useMemo(() => {
    // Only count active registrations (paid/verified)
    const active = participants.filter(p => ['verified', 'paid'].includes(p.status))
    const total = active.length
    const cleared = active.filter(p => p.weighed_in_at).length
    const pending = total - cleared

    return {
      chartData: [
        { status: "cleared", count: cleared, fill: "var(--color-cleared)" },
        { status: "pending", count: pending, fill: "var(--color-pending)" },
      ],
      total,
      cleared,
      percentage: total > 0 ? Math.round((cleared / total) * 100) : 0
    }
  }, [participants])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Weigh-In Completion</CardTitle>
        <CardDescription>Athletes cleared for competition</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
             <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data.chartData}
              dataKey="count"
              nameKey="status"
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
                          {data.percentage}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Cleared
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
