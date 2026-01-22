import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface BracketGenerationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participantCount: number
  matchCount?: number
  type?: 'bracket' | 'schedule'
}

const BRACKET_STEPS = [
  "Validating tournament parameters",
  "Fetching verified participants",
  "Assigning divisions",
  "Generating seeded matchups",
  "Finalizing bracket structure"
]

const SCHEDULE_STEPS = [
  "Analyzing schedule configurations",
  "Validating match durations",
  "Assigning match numbers",
  "Optimizing court utilization",
  "Finalizing daily milestones"
]

export function BracketGenerationModal({ open, onOpenChange, participantCount, matchCount = 0, type = 'bracket' }: BracketGenerationModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const steps = type === 'schedule' ? SCHEDULE_STEPS : BRACKET_STEPS
  const title = type === 'schedule' ? 'Generating Schedule' : 'Generating Brackets'
  const description = type === 'schedule' 
    ? 'Please wait while we optimize the tournament schedule.'
    : 'Please wait while we organize the tournament structure.'

  // Estimate duration:
  // Bracket: 2s base overhead + ~0.2s per participant (creation is heavier)
  // Schedule: 3s base overhead + ~0.05s per match (mostly updates & calculation)
  // If matchCount is 0 (first run), fallback to participant heuristic for schedule too.
  const estimatedSeconds = type === 'schedule'
    ? Math.max(3, Math.ceil(3000 + (matchCount || participantCount) * 50) / 1000)
    : Math.max(3, Math.ceil((2000 + participantCount * 200) / 1000))

  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setProgress(0)
      
      const totalDuration = estimatedSeconds * 1000
      
      // Scale steps to match total duration
      const stepDuration = totalDuration / steps.length
      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < steps.length - 1) return prev + 1
          return prev
        })
      }, stepDuration) 

      // Scale progress bar to reach 90% over total duration
      const updateInterval = 100
      const totalUpdates = totalDuration / updateInterval
      const incrementPerUpdate = 90 / totalUpdates

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return Math.min(prev + incrementPerUpdate, 90)
        })
      }, updateInterval)

      return () => {
        clearInterval(stepInterval)
        clearInterval(progressInterval)
      }
    }
  }, [open, estimatedSeconds, steps.length])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isPending = index > currentStep

            return (
              <div key={index} className="flex items-center space-x-3">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    isCompleted && "text-muted-foreground line-through",
                    isCurrent && "font-medium text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>
        
        <div className="space-y-2 pt-2">
            <Progress value={progress} className="h-2 w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Estimated time: ~{estimatedSeconds}s</span>
                <span>{Math.round(progress)}% complete</span>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
