"use client";

import { createContext, useContext, ReactNode } from "react";
import { useTournamentNotifications } from "@/lib/hooks/use-tournament-notifications";
import { useRegistrationNotifications } from "@/lib/hooks/use-registration-notifications";
import { useResultsNotifications } from "@/lib/hooks/use-results-notifications";

interface NotificationContextType {
  sendTournamentReminder: (tournamentId: string) => Promise<void>;
  sendBulkResultNotifications: (tournamentId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // Initialize all notification hooks
  const { sendTournamentReminder } = useTournamentNotifications();
  const { sendBulkResultNotifications } = useResultsNotifications();
  
  // Initialize registration notifications (no return values needed)
  useRegistrationNotifications();

  const value: NotificationContextType = {
    sendTournamentReminder,
    sendBulkResultNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
