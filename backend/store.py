import os
import sqlite3
import uuid
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "personas.db")


def _conn():
    return sqlite3.connect(DB_PATH)


def init_db():
    with _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS personas (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                instructions TEXT NOT NULL,
                voice_id TEXT NOT NULL,
                session_id TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        # Migrate older DBs that predate the session_id column.
        cols = {r[1] for r in c.execute("PRAGMA table_info(personas)").fetchall()}
        if "session_id" not in cols:
            c.execute("ALTER TABLE personas ADD COLUMN session_id TEXT")


def add_persona(name: str, instructions: str, voice_id: str, session_id: str) -> str:
    persona_id = f"custom_{uuid.uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc).isoformat()
    with _conn() as c:
        c.execute(
            "INSERT INTO personas (id, name, instructions, voice_id, session_id, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (persona_id, name, instructions, voice_id, session_id, created_at),
        )
    return persona_id


def list_personas(session_id: str) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT id, name, instructions, voice_id FROM personas "
            "WHERE session_id = ? ORDER BY created_at DESC",
            (session_id,),
        ).fetchall()
    return [
        {"id": r[0], "name": r[1], "instructions": r[2], "voice_id": r[3]}
        for r in rows
    ]


def get_persona(persona_id: str) -> dict | None:
    """Look up by id alone (used by the WS endpoint, which already has the id)."""
    with _conn() as c:
        row = c.execute(
            "SELECT id, name, instructions, voice_id, session_id FROM personas WHERE id = ?",
            (persona_id,),
        ).fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "instructions": row[2], "voice_id": row[3], "session_id": row[4]}


def delete_persona(persona_id: str, session_id: str) -> bool:
    with _conn() as c:
        cur = c.execute(
            "DELETE FROM personas WHERE id = ? AND session_id = ?",
            (persona_id, session_id),
        )
        return cur.rowcount > 0
