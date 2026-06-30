import os
import uuid
from psycopg_pool import ConnectionPool

# Postgres-backed persona store (DigitalOcean Managed Postgres in prod).
# Connection comes from DATABASE_URL (DO injects it on App Platform; set it in .env locally).
_pool: ConnectionPool | None = None


def _pool_() -> ConnectionPool:
    global _pool
    if _pool is None:
        dsn = os.environ.get("DATABASE_URL")
        if not dsn:
            raise RuntimeError("DATABASE_URL is not set — point it at your Postgres cluster.")
        _pool = ConnectionPool(dsn, min_size=1, max_size=5, kwargs={"autocommit": True})
    return _pool


def init_db():
    with _pool_().connection() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS personas (
                id           TEXT PRIMARY KEY,
                name         TEXT NOT NULL,
                instructions TEXT NOT NULL,
                voice_id     TEXT NOT NULL,
                session_id   TEXT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS personas_session_idx ON personas (session_id)")
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id           TEXT PRIMARY KEY,
                session_id   TEXT,
                persona_id   TEXT,
                persona_name TEXT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS conversations_session_idx ON conversations (session_id)")
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id              BIGSERIAL PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                seq             INT NOT NULL,
                role            TEXT NOT NULL,
                text            TEXT NOT NULL
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages (conversation_id, seq)")


def add_persona(name: str, instructions: str, voice_id: str, session_id: str) -> str:
    persona_id = f"custom_{uuid.uuid4().hex[:8]}"
    with _pool_().connection() as c:
        c.execute(
            "INSERT INTO personas (id, name, instructions, voice_id, session_id) "
            "VALUES (%s, %s, %s, %s, %s)",
            (persona_id, name, instructions, voice_id, session_id),
        )
    return persona_id


def list_personas(session_id: str) -> list[dict]:
    with _pool_().connection() as c:
        rows = c.execute(
            "SELECT id, name, instructions, voice_id FROM personas "
            "WHERE session_id = %s ORDER BY created_at DESC",
            (session_id,),
        ).fetchall()
    return [{"id": r[0], "name": r[1], "instructions": r[2], "voice_id": r[3]} for r in rows]


def get_persona(persona_id: str) -> dict | None:
    with _pool_().connection() as c:
        row = c.execute(
            "SELECT id, name, instructions, voice_id, session_id FROM personas WHERE id = %s",
            (persona_id,),
        ).fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "instructions": row[2], "voice_id": row[3], "session_id": row[4]}


def delete_persona(persona_id: str, session_id: str) -> bool:
    with _pool_().connection() as c:
        cur = c.execute(
            "DELETE FROM personas WHERE id = %s AND session_id = %s",
            (persona_id, session_id),
        )
        return cur.rowcount > 0


def update_persona(persona_id: str, session_id: str, name: str, instructions: str) -> bool:
    with _pool_().connection() as c:
        cur = c.execute(
            "UPDATE personas SET name=%s, instructions=%s WHERE id=%s AND session_id=%s",
            (name, instructions, persona_id, session_id),
        )
        return cur.rowcount > 0


# ---- Conversation transcripts (text only) ----

def save_conversation(session_id: str, persona_id: str, persona_name: str, turns: list[dict]) -> str:
    """turns: [{"role": "user"|"assistant", "text": str}, ...] in order. No-op if empty."""
    if not turns:
        return ""
    conv_id = f"conv_{uuid.uuid4().hex[:10]}"
    with _pool_().connection() as c:
        c.execute(
            "INSERT INTO conversations (id, session_id, persona_id, persona_name) VALUES (%s, %s, %s, %s)",
            (conv_id, session_id, persona_id, persona_name),
        )
        with c.cursor() as cur:
            cur.executemany(
                "INSERT INTO messages (conversation_id, seq, role, text) VALUES (%s, %s, %s, %s)",
                [(conv_id, i, t["role"], t["text"]) for i, t in enumerate(turns)],
            )
    return conv_id


def list_conversations(session_id: str) -> list[dict]:
    with _pool_().connection() as c:
        rows = c.execute(
            """
            SELECT c.id, c.persona_id, c.persona_name, c.created_at, COUNT(m.id) AS turns
            FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.session_id = %s
            GROUP BY c.id ORDER BY c.created_at DESC
            """,
            (session_id,),
        ).fetchall()
    return [
        {"id": r[0], "persona_id": r[1], "persona_name": r[2],
         "created_at": r[3].isoformat(), "turns": r[4]}
        for r in rows
    ]


def get_conversation(conv_id: str, session_id: str) -> dict | None:
    with _pool_().connection() as c:
        head = c.execute(
            "SELECT id, persona_id, persona_name, created_at FROM conversations WHERE id = %s AND session_id = %s",
            (conv_id, session_id),
        ).fetchone()
        if not head:
            return None
        msgs = c.execute(
            "SELECT role, text FROM messages WHERE conversation_id = %s ORDER BY seq",
            (conv_id,),
        ).fetchall()
    return {
        "id": head[0], "persona_id": head[1], "persona_name": head[2],
        "created_at": head[3].isoformat(),
        "messages": [{"role": m[0], "text": m[1]} for m in msgs],
    }


def delete_conversation(conv_id: str, session_id: str) -> bool:
    with _pool_().connection() as c:
        cur = c.execute(
            "DELETE FROM conversations WHERE id = %s AND session_id = %s",
            (conv_id, session_id),
        )
        return cur.rowcount > 0
