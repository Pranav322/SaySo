// Per-browser session id so each user sees only their own custom personas.
// No auth — just a stable random id persisted in localStorage.
const KEY = 'mirror_session_id'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
