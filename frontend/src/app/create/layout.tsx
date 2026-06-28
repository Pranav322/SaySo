import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create a persona',
  description: 'Build your own persona — give it a name, describe how it should behave, and clone any voice from a short clip.',
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children
}
