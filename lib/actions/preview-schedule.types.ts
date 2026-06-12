/**
 * Shared types for the dry-run schedule preview. Kept out of the `'use server'`
 * action module so the action file only exports async functions and these types
 * can be imported freely by client components.
 */

import type { AthleteClash } from '@/types/models'

export interface SchedulePreviewMatch {
  matchId: string
  matchNumber: string
  day: number
  court: number
  startMin: number // minute-of-day
  endMin: number // minute-of-day
  player1Name: string
  player2Name: string
  divisionName: string
  categoryName: string
  roundName: string
  skillCategory: string
}

export interface SchedulePreviewConfig {
  courts: number
  dailyStartTime: string
  dailyEndTime: string
  lunchEnabled: boolean
  lunchStartTime: string
  lunchEndTime: string
}

export interface SchedulePreviewData {
  matches: SchedulePreviewMatch[]
  config: SchedulePreviewConfig
  clashes: AthleteClash[]
  feasible: boolean
  overflowCount: number
  totalDays: number
}
