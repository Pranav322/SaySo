import Link from 'next/link'

export type ConvState = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'STOPPED'

interface Props {
  state: ConvState
  onStart: () => void
  onStop: () => void
  micError?: string | null
}

export function ConversationControls({ state, onStart, onStop, micError }: Props) {
  return (
    <div className="flex flex-col items-center gap-6">
      {micError && (
        <p className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-300">{micError}</p>
      )}

      {state === 'IDLE' && (
        <button
          onClick={onStart}
          className="rounded-full bg-white px-10 py-4 text-lg font-semibold text-black
                     transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          Start Conversation
        </button>
      )}

      {state === 'CONNECTING' && (
        <div className="flex items-center gap-3 text-white/60">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span>Connecting…</span>
        </div>
      )}

      {state === 'ACTIVE' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            Listening
          </div>
          <button
            onClick={onStop}
            className="rounded-full border border-red-500/50 bg-red-500/20 px-10 py-4
                       text-lg font-semibold text-red-300 transition hover:bg-red-500/30
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
          >
            Stop
          </button>
        </div>
      )}

      {state === 'STOPPED' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-white/50">Session ended</p>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-8 py-3 text-sm text-white/70
                       transition hover:border-white/40 hover:text-white"
          >
            ← Back to personas
          </Link>
        </div>
      )}
    </div>
  )
}
