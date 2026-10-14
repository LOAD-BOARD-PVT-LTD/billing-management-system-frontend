"use client"

import { TrendingUp } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A radar chart with dots"

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 273 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ChartRadarDots() {
  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold">Radar Chart - Dots</h3>
        <p className="text-sm text-muted-foreground">
          Showing total visitors for the last 6 months
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-square w-80 h-80"
        >
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
              dataKey="desktop"
              fill="var(--color-desktop)"
              fillOpacity={0.6}
              dot={{
                r: 4,
                fillOpacity: 1,
              }}
            />
          </RadarChart>
        </ChartContainer>
      </div>
      <div className="flex flex-col gap-1 text-sm text-center mt-2">
        <div className="flex items-center justify-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground flex items-center justify-center gap-2 leading-none">
          January - June 2024
        </div>
      </div>
    </div>
  )
}
