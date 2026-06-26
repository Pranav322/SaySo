'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { WS_BASE } from '@/lib/constants'

type WsStatus = 'connecting' | 'open' | 'closed' | 'error'

export function useWebSocket(
  personaId: string,
  onMessage: (data: ArrayBuffer) => void,
  voice?: string,
  onEvent?: (evt: { type: string; event?: string }) => void,
  mode: 'ptt' | 'hands_free' = 'ptt',
) {
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  const onEventRef = useRef(onEvent)
  onMessageRef.current = onMessage
  onEventRef.current = onEvent

  const [status, setStatus] = useState<WsStatus>('connecting')

  useEffect(() => {
    const qs = new URLSearchParams({ mode })
    if (voice) qs.set('voice', voice)
    const ws = new WebSocket(`${WS_BASE}/ws/converse/${personaId}?${qs}`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen    = () => setStatus('open')
    ws.onerror   = () => setStatus('error')
    ws.onclose   = () => setStatus('closed')
    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        onMessageRef.current(e.data)
      } else if (typeof e.data === 'string') {
        try { onEventRef.current?.(JSON.parse(e.data)) } catch { /* ignore */ }
      }
    }

    return () => { ws.close() }
  }, [personaId, voice, mode])

  const sendBinary = useCallback((buf: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(buf)
    }
  }, [])

  const sendText = useCallback((obj: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj))
    }
  }, [])

  return { status, sendBinary, sendText }
}
