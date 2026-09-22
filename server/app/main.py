import os
from datetime import datetime, timezone
from typing import Any

import psycopg
from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field
from psycopg.rows import dict_row

APP_VERSION = "3.12.0-alpha.1"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
API_BEARER = os.environ.get("GH_API_BEARER", "")

app = FastAPI(title="Ghestban Server", version=APP_VERSION)


class SnapshotIn(BaseModel):
    householdId: str = Field(min_length=1, max_length=120)
    payload: dict[str, Any]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def auth(authorization: str | None) -> None:
    if not API_BEARER:
        raise HTTPException(status_code=503, detail="server-auth-not-configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing-bearer")
    if authorization[7:] != API_BEARER:
        raise HTTPException(status_code=403, detail="invalid-bearer")


def connect():
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="database-not-configured")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


@app.on_event("startup")
def ensure_schema() -> None:
    if not DATABASE_URL:
        return
    with connect() as con, con.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS sync_snapshots (
              household_id VARCHAR(120) PRIMARY KEY,
              payload JSONB NOT NULL,
              revision BIGINT NOT NULL DEFAULT 1,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        con.commit()


@app.get("/v1/health")
def health() -> dict[str, Any]:
    db = False
    try:
        with connect() as con, con.cursor() as cur:
            cur.execute("SELECT 1 AS ok")
            db = cur.fetchone()["ok"] == 1
    except Exception:
        db = False
    return {
        "ok": db,
        "service": "ghestban-server",
        "version": APP_VERSION,
        "database": "ok" if db else "unavailable",
        "time": utcnow().isoformat(),
    }


@app.put("/v1/sync/snapshot")
def put_snapshot(
    body: SnapshotIn,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    auth(authorization)
    if body.payload.get("format") != "ghestban-next":
        raise HTTPException(status_code=400, detail="invalid-snapshot-format")
    with connect() as con, con.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sync_snapshots(household_id, payload, revision, updated_at)
            VALUES (%s, %s, 1, NOW())
            ON CONFLICT (household_id) DO UPDATE
            SET payload = EXCLUDED.payload,
                revision = sync_snapshots.revision + 1,
                updated_at = NOW()
            RETURNING household_id, revision, updated_at;
            """,
            (body.householdId, psycopg.types.json.Jsonb(body.payload)),
        )
        row = cur.fetchone()
        con.commit()
    return {"ok": True, "householdId": row["household_id"], "revision": row["revision"], "updatedAt": row["updated_at"].isoformat()}


@app.get("/v1/sync/snapshot")
def get_snapshot(
    householdId: str = Query(min_length=1, max_length=120),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    auth(authorization)
    with connect() as con, con.cursor() as cur:
        cur.execute(
            "SELECT household_id, payload, revision, updated_at FROM sync_snapshots WHERE household_id=%s",
            (householdId,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="snapshot-not-found")
    return {
        "ok": True,
        "householdId": row["household_id"],
        "payload": row["payload"],
        "revision": row["revision"],
        "updatedAt": row["updated_at"].isoformat(),
    }
