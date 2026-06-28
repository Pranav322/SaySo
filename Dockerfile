# Backend image (FastAPI + WebSocket relay). Built by DO App Platform for the `api` component.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install dependencies first (cached layer) — deps live in the root pyproject/uv.lock.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# App code
COPY backend ./backend

# App Platform provides $PORT (defaults to 8080).
CMD ["sh", "-c", "uv run --no-sync uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
