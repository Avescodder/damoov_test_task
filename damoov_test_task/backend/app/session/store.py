from dataclasses import dataclass, field
from typing import Any

from app.telematics.client import TelematicsClient


@dataclass
class PendingWrite:
    confirmation_id: str
    tool_call_id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class PendingTurn:
    assistant_message: dict[str, Any]
    tool_results: list[dict[str, Any]]
    writes: list[PendingWrite]


@dataclass
class Session:
    session_id: str
    token: str
    application_id: str
    client: TelematicsClient
    history: list[dict[str, Any]] = field(default_factory=list)
    pending: PendingTurn | None = None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    async def start(
        self, session_id: str, token: str, application_id: str, base_url: str
    ) -> Session:
        existing = self._sessions.get(session_id)
        if existing is not None:
            existing.application_id = application_id
            existing.pending = None
            if existing.token != token:
                await existing.client.aclose()
                existing.client = TelematicsClient(base_url, token)
                existing.token = token
            return existing

        session = Session(
            session_id=session_id,
            token=token,
            application_id=application_id,
            client=TelematicsClient(base_url, token),
        )
        self._sessions[session_id] = session
        return session

    async def drop(self, session_id: str) -> None:
        session = self._sessions.pop(session_id, None)
        if session is not None:
            await session.client.aclose()


store = SessionStore()
