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
