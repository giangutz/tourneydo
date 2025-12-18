"use client"

import { useEffect, useState } from "react"
import { Timer, CalendarClock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface TournamentCountdownProps {
  startDate: string | null
}

export function TournamentCountdown({ startDate }: TournamentCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  const [isCalculated, setIsCalculated] = useState(false)

  useEffect(() => {
    if (!startDate) return

    const target = new Date(startDate).getTime()

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const difference = target - now

      if (difference < 0) {
        return null // Started
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      }
    }

    // Initial calculation
    setTimeLeft(calculateTimeLeft())
    setIsCalculated(true)

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [startDate])

  if (!startDate) {
    return null
  }

  if (!isCalculated) {
    return null
  }

  if (!timeLeft) {
    return null
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-background border rounded-lg p-3 md:p-4 min-w-[70px] md:min-w-[100px] flex items-center justify-center shadow-sm">
        <span className="text-3xl md:text-5xl font-mono font-bold tracking-tight">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs md:text-sm text-muted-foreground mt-2 uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  )

  const Separator = () => (
    <div className="text-2xl md:text-4xl font-bold text-muted-foreground/30 pb-6">:</div>
  )

  return (
    <div className="w-full mb-8">
      <div className="flex flex-col items-center justify-center space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Tournament Starts In</h3>
        <div className="flex items-center gap-2 md:gap-4">
          <TimeBlock value={timeLeft.days} label="Days" />
          <Separator />
          <TimeBlock value={timeLeft.hours} label="Hours" />
          <Separator />
          <TimeBlock value={timeLeft.minutes} label="Minutes" />
          <Separator />
          <TimeBlock value={timeLeft.seconds} label="Seconds" />
        </div>
      </div>
    </div>
  )
}
