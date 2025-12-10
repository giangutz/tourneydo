'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  participantCount: number
  participantNames?: string[]
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  participantCount,
  participantNames = []
}: DeleteConfirmDialogProps) {
  const isBulk = participantCount > 1

  return (
    <div suppressHydrationWarning>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBulk 
                ? `Delete ${participantCount} Participants?` 
                : 'Delete Participant?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {isBulk
                    ? `Are you sure you want to delete ${participantCount} participants? This action cannot be undone.`
                    : 'Are you sure you want to delete this participant? This action cannot be undone.'}
                </p>
                {participantNames.length > 0 && participantNames.length <= 5 && (
                  <div className="mt-3 p-3 bg-muted rounded-md text-foreground">
                    <p className="text-sm font-medium mb-2">Participants to be deleted:</p>
                    <ul className="text-sm space-y-1">
                      {participantNames.map((name, idx) => (
                        <li key={idx} className="text-muted-foreground">• {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {participantNames.length > 5 && (
                  <div className="mt-3 p-3 bg-muted rounded-md text-foreground">
                    <p className="text-sm font-medium">
                      {participantNames.length} participants will be deleted
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {isBulk && `${participantCount} Participants`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
