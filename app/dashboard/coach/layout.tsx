import { AppShell } from '@/components/layout/app-shell'

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
