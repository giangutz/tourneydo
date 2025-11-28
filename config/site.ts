/**
 * Site configuration
 * 
 * Centralized configuration for the application
 */

export const siteConfig = {
  name: 'TourneyDo',
  description: 'Tournament management and athlete registration platform',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  links: {
    github: 'https://github.com/yourusername/startup-boilerplate',
    twitter: 'https://twitter.com/tourneydo',
  },

  // Navigation items for different roles
  navigation: {
    coach: [
      {
        title: 'Dashboard',
        href: '/dashboard/coach',
        icon: 'LayoutDashboard',
      },
      {
        title: 'My Teams',
        href: '/dashboard/coach/teams',
        icon: 'Shield',
      },
      {
        title: 'My Players',
        href: '/dashboard/coach/players',
        icon: 'Users',
      },
      {
        title: 'Tournaments',
        href: '/dashboard/coach/tournaments',
        icon: 'Trophy',
      },
    ],
    'tournament-organizer': [
      {
        title: 'Dashboard',
        href: '/dashboard/tournament-organizer',
        icon: 'LayoutDashboard',
      },
      {
        title: 'Tournaments',
        href: '/dashboard/tournament-organizer/tournaments',
        icon: 'Trophy',
      },
      {
        title: 'Athletes',
        href: '/dashboard/tournament-organizer/athletes',
        icon: 'Users',
      },
    ],
  },
} as const

export type SiteConfig = typeof siteConfig
