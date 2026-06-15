import asyncio
import json
import uuid
from typing import Any, Awaitable, Callable

from openai import AsyncOpenAI

from app.agent import tools
from app.agent.prompts import SYSTEM_PROMPT
from app.config import settings
from app.session.store import PendingTurn, PendingWrite, Session
from app.telematics.client import TelematicsError

Emit = Callable[[dict[str, Any]], Awaitable[None]]

MAX_ITERATIONS = 6


class AgentLoop:
    def __init__(self, client: AsyncOpenAI, session: Session, emit: Emit) -> None:
        self._client = client
        self._session = session
        self._emit = emit

    async def run(self, user_text: str) -> None:
        history = self._session.history
        if not history:
            history.append({'role': 'system', 'content': SYSTEM_PROMPT})
        history.append({'role': 'user', 'content': user_text})
        await self._loop()

    async def confirm(self, confirmation_id: str, approved: bool) -> None:
        pending = self._session.pending
        if pending is None or not pending.writes:
            return
        write = pending.writes[0]
        if write.confirmation_id != confirmation_id:
            return

        if approved:
            await self._emit({'type': 'tool', 'name': write.name, 'status': 'running'})
            try:
                result = await tools.run_tool(self._session, write.name, write.arguments, self._emit)
            except TelematicsError as error:
                result = f'Action failed: {error}'
            await self._emit({'type': 'tool', 'name': write.name, 'status': 'done'})
        else:
            result = 'The user declined this action.'

        pending.tool_results.append(self._tool_result(write.tool_call_id, result))
        pending.writes.pop(0)

        if pending.writes:
            await self._request_confirmation(pending.writes[0])
            return

        self._session.history.append(pending.assistant_message)
        self._session.history.extend(pending.tool_results)
        self._session.pending = None
        await self._loop()

    async def _loop(self) -> None:
        for _ in range(MAX_ITERATIONS):
            text, calls = await self._stream_completion()
            if not calls:
                if text:
                    self._session.history.append({'role': 'assistant', 'content': text})
                return

            assistant_message = self._assistant_message(text, calls)
            reads = [call for call in calls if not tools.is_write(call['name'])]
            writes = [call for call in calls if tools.is_write(call['name'])]
            results = await self._run_reads(reads)

            if writes:
                self._session.pending = PendingTurn(
                    assistant_message=assistant_message,
                    tool_results=results,
                    writes=[
                        PendingWrite(
                            confirmation_id=uuid.uuid4().hex,
                            tool_call_id=call['id'],
                            name=call['name'],
                            arguments=call['args'],
                        )
                        for call in writes
                    ],
                )
                await self._request_confirmation(self._session.pending.writes[0])
                return

            self._session.history.append(assistant_message)
            self._session.history.extend(results)

    async def _run_reads(self, reads: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not reads:
            return []

        async def execute(call: dict[str, Any]) -> dict[str, Any]:
            await self._emit({'type': 'tool', 'name': call['name'], 'status': 'running'})
            try:
                text = await tools.run_tool(self._session, call['name'], call['args'], self._emit)
            except TelematicsError as error:
                text = f'Tool error: {error}'
            await self._emit({'type': 'tool', 'name': call['name'], 'status': 'done'})
            return self._tool_result(call['id'], text)

        return list(await asyncio.gather(*(execute(call) for call in reads)))

    async def _request_confirmation(self, write: PendingWrite) -> None:
        summary, details = tools.summarize_write(write.name, write.arguments)
        await self._emit(
            {
                'type': 'confirmation',
                'confirmationId': write.confirmation_id,
                'action': write.name,
                'summary': summary,
                'details': details,
            }
        )

    async def _stream_completion(self) -> tuple[str, list[dict[str, Any]]]:
        stream = await self._client.chat.completions.create(
            model=settings.groq_model,
            temperature=settings.groq_temperature,
            messages=self._session.history,
            tools=tools.TOOL_SCHEMAS,
            stream=True,
        )
        parts: list[str] = []
        calls: dict[int, dict[str, Any]] = {}

        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta.content:
                parts.append(delta.content)
                await self._emit({'type': 'token', 'delta': delta.content})
            for call in delta.tool_calls or []:
                slot = calls.setdefault(call.index, {'id': None, 'name': None, 'raw': ''})
                if call.id:
                    slot['id'] = call.id
                if call.function and call.function.name:
                    slot['name'] = call.function.name
                if call.function and call.function.arguments:
                    slot['raw'] += call.function.arguments

        finalized = [self._finalize(slot) for _, slot in sorted(calls.items())]
        return ''.join(parts), finalized

    @staticmethod
    def _finalize(slot: dict[str, Any]) -> dict[str, Any]:
        raw = slot['raw'] or '{}'
        try:
            args = json.loads(raw)
        except json.JSONDecodeError:
            args = {}
        return {'id': slot['id'], 'name': slot['name'], 'args': args, 'raw': raw}

    @staticmethod
    def _assistant_message(text: str, calls: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            'role': 'assistant',
            'content': text or None,
            'tool_calls': [
                {
                    'id': call['id'],
                    'type': 'function',
                    'function': {'name': call['name'], 'arguments': call['raw']},
                }
                for call in calls
            ],
        }

    @staticmethod
    def _tool_result(tool_call_id: str, content: str) -> dict[str, Any]:
        return {'role': 'tool', 'tool_call_id': tool_call_id, 'content': content}
