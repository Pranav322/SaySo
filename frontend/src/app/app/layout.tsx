import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Choose someone to talk to',
  description: 'Pick a persona to practice with — a friend, a first date, a new face, a mentor — or clone a voice of your own.',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children
}
