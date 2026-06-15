from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from openai import AsyncOpenAI

from app.agent.loop import AgentLoop
from app.config import settings
from app.session.store import store

router = APIRouter()

_openai: AsyncOpenAI | None = None


def _client() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        _openai = AsyncOpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)
    return _openai


@router.websocket('/ws')
async def chat_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    session_id: str | None = None

    async def emit(message: dict[str, Any]) -> None:
        await websocket.send_json(message)

    try:
        while True:
            message = await websocket.receive_json()
            kind = message.get('type')

            if kind == 'ping':
                continue

            if kind == 'init':
                session_id = message['sessionId']
                await store.start(
                    session_id,
                    message['token'],
                    message['applicationId'],
                    settings.telematics_base_url,
                )
                continue

            session = store.get(session_id) if session_id else None
            if session is None:
                await emit({'type': 'error', 'message': 'Session not initialized.'})
                continue

            loop = AgentLoop(_client(), session, emit)
            try:
                if kind == 'user_message':
                    await loop.run(message['text'])
                elif kind == 'confirm':
                    await loop.confirm(message['confirmationId'], message['approved'])
                await emit({'type': 'done'})
            except Exception as error:  # noqa: BLE001 - keep the socket alive
                await emit({'type': 'error', 'message': str(error)})
    except WebSocketDisconnect:
        pass
