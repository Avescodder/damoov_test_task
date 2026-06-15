import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.agent.loop import AgentLoop
from app.session.store import Session


def _chunk(content=None, tool_call=None):
    delta = SimpleNamespace(content=content, tool_calls=[tool_call] if tool_call else None)
    return SimpleNamespace(choices=[SimpleNamespace(delta=delta, finish_reason=None)])


def _tool_call(index, call_id, name, arguments):
    return SimpleNamespace(
        index=index, id=call_id, function=SimpleNamespace(name=name, arguments=arguments)
    )


class _Stream:
    def __init__(self, chunks):
        self._chunks = chunks

    async def __aiter__(self):
        for chunk in self._chunks:
            yield chunk


class _FakeOpenAI:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = 0
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    async def _create(self, **_):
        response = self._responses[self.calls]
        self.calls += 1
        return _Stream(response)


def _session(client):
    return Session(session_id='s1', token='jwt', application_id='app', client=client)


def _collect():
    events: list[dict] = []

    async def emit(message):
        events.append(message)

    return events, emit


def test_write_tool_waits_for_confirmation_then_runs():
    responses = [
        [
            _chunk(
                tool_call=_tool_call(
                    0,
                    'call_1',
                    'set_user_status',
                    '{"device_token": "f925d077-xyz", "status": "Inactive"}',
                )
            )
        ],
        [_chunk(content='Done, the user is now Inactive.')],
    ]
    updated_row = {'DeviceToken': 'f925d077-xyz', 'Status': 'Inactive'}
    telematics = SimpleNamespace(
        set_user_status=AsyncMock(return_value={}),
        find_user=AsyncMock(return_value=updated_row),
    )
    session = _session(telematics)
    events, emit = _collect()
    loop = AgentLoop(_FakeOpenAI(responses), session, emit)

    asyncio.run(loop.run('Disable user f925d077-xyz'))

    telematics.set_user_status.assert_not_called()
    confirmations = [event for event in events if event['type'] == 'confirmation']
    assert len(confirmations) == 1
    assert session.pending is not None

    asyncio.run(loop.confirm(confirmations[0]['confirmationId'], True))

    telematics.set_user_status.assert_awaited_once_with('f925d077-xyz', 'Inactive')
    assert session.pending is None
    assert any(event['type'] == 'token' for event in events)

    updated = [event for event in events if event['type'] == 'user_updated']
    assert updated and updated[0]['row'] == updated_row


def test_approved_delete_emits_user_deleted():
    responses = [
        [_chunk(tool_call=_tool_call(0, 'call_1', 'delete_user', '{"device_token": "f925d077-xyz"}'))],
        [_chunk(content='The user has been deleted.')],
    ]
    telematics = SimpleNamespace(delete_user=AsyncMock(return_value={}))
    session = _session(telematics)
    events, emit = _collect()
    loop = AgentLoop(_FakeOpenAI(responses), session, emit)

    asyncio.run(loop.run('Delete user f925d077-xyz'))
    confirmation_id = next(e for e in events if e['type'] == 'confirmation')['confirmationId']

    asyncio.run(loop.confirm(confirmation_id, True))

    telematics.delete_user.assert_awaited_once_with('f925d077-xyz')
    deleted = [event for event in events if event['type'] == 'user_deleted']
    assert deleted and deleted[0]['deviceToken'] == 'f925d077-xyz'


def test_declined_write_is_not_executed():
    responses = [
        [_chunk(tool_call=_tool_call(0, 'call_1', 'delete_user', '{"device_token": "f925d077-xyz"}'))],
        [_chunk(content='Understood, I left the user in place.')],
    ]
    telematics = SimpleNamespace(delete_user=AsyncMock(return_value={}))
    session = _session(telematics)
    events, emit = _collect()
    loop = AgentLoop(_FakeOpenAI(responses), session, emit)

    asyncio.run(loop.run('Delete user f925d077-xyz'))
    confirmation_id = next(e for e in events if e['type'] == 'confirmation')['confirmationId']

    asyncio.run(loop.confirm(confirmation_id, False))

    telematics.delete_user.assert_not_called()
    assert session.pending is None


def test_read_tool_runs_immediately_and_emits_users():
    responses = [
        [_chunk(tool_call=_tool_call(0, 'call_1', 'list_users', '{"page": 1}'))],
        [_chunk(content='There is 1 user.')],
    ]
    rows = [{'DeviceToken': 'f925d077-xyz', 'UserFields': [{'ClientId': 'Samsung'}]}]
    telematics = SimpleNamespace(
        list_users=AsyncMock(return_value={'Users': rows, 'TotalUsers': 1, 'CurrentPage': 1, 'TotalPages': 1})
    )
    session = _session(telematics)
    events, emit = _collect()
    loop = AgentLoop(_FakeOpenAI(responses), session, emit)

    asyncio.run(loop.run('Show me the users'))

    telematics.list_users.assert_awaited_once()
    assert session.pending is None
    user_events = [event for event in events if event['type'] == 'users']
    assert user_events and user_events[0]['rows'] == rows
