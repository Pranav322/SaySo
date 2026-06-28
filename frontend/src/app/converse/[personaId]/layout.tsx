import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'In conversation',
  description: 'A real-time voice conversation — speak out loud and they talk right back.',
}

export default function ConverseLayout({ children }: { children: React.ReactNode }) {
  return children
}
