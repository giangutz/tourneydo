import { AppShell } from '@/components/layout/app-shell'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // if user is not tournament-organizer, redirect to dashboard/coach else dashboard/tournament-organizer
  const { user } = useUser();

  if (!user) {
    redirect('/sign-in')
  }

  const userPublicMetadata = user?.publicMetadata;

  if (userPublicMetadata?.role !== 'tournament-organizer') {
    redirect('/dashboard/coach')
  }

  redirect('/dashboard/tournament-organizer')

  return <AppShell>{children}</AppShell>
}
