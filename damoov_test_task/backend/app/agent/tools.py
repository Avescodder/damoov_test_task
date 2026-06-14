import json
from typing import Any, Awaitable, Callable

from app.session.store import Session

Emit = Callable[[dict[str, Any]], Awaitable[None]]

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        'type': 'function',
        'function': {
            'name': 'list_users',
            'description': 'List users for the application, paged. Use for browsing or filtered searches.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'page': {'type': 'integer', 'minimum': 1, 'default': 1},
                    'page_size': {'type': 'integer', 'minimum': 1, 'maximum': 100, 'default': 20},
                    'search_term': {'type': 'string'},
                    'activity_status': {'type': 'string'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'find_user',
            'description': 'Find a single user by one or more identifiers.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'device_token': {'type': 'string'},
                    'email': {'type': 'string'},
                    'phone': {'type': 'string'},
                    'client_id': {'type': 'string'},
                    'full_name': {'type': 'string'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'count_users',
            'description': 'Count users, optionally filtered by enabled, tracking, or deactivated state.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'is_enabled': {'type': 'boolean'},
                    'is_tracking_enabled': {'type': 'boolean'},
                    'include_deactivated': {'type': 'boolean'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'set_user_status',
            'description': 'Set a user Active or Inactive.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'device_token': {'type': 'string'},
                    'status': {'type': 'string', 'enum': ['Active', 'Inactive']},
                },
                'required': ['device_token', 'status'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'set_sdk_settings',
            'description': "Update a user's SDK settings. Only the provided flags change.",
            'parameters': {
                'type': 'object',
                'properties': {
                    'device_token': {'type': 'string'},
                    'enable_tracking': {'type': 'boolean'},
                    'enabled': {'type': 'boolean'},
                    'enable_logging': {'type': 'boolean'},
                    'enable_real_time_location': {'type': 'boolean'},
                },
                'required': ['device_token'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'delete_user',
            'description': 'Permanently delete a user by device token.',
            'parameters': {
                'type': 'object',
                'properties': {'device_token': {'type': 'string'}},
                'required': ['device_token'],
            },
        },
    },
]

WRITE_TOOLS = {'set_user_status', 'set_sdk_settings', 'delete_user'}

SDK_FLAGS = {
    'enable_tracking': 'EnableTracking',
    'enabled': 'Enabled',
    'enable_logging': 'EnableLogging',
    'enable_real_time_location': 'EnableRealTimeLocation',
}


def is_write(name: str) -> bool:
    return name in WRITE_TOOLS


def summarize_write(name: str, args: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    token = _short(args.get('device_token'))
    if name == 'set_user_status':
        return f'Set user {token} to {args.get("status")}.', args
    if name == 'delete_user':
        return f'Delete user {token}. This cannot be undone.', args
    flags = {label: args[key] for key, label in SDK_FLAGS.items() if key in args}
    changes = ', '.join(f'{label}={value}' for label, value in flags.items()) or 'no changes'
    return f'Update SDK settings for user {token}: {changes}.', args


async def run_tool(session: Session, name: str, args: dict[str, Any], emit: Emit) -> str:
    handler = _HANDLERS[name]
    return await handler(session, args, emit)


async def _list_users(session: Session, args: dict[str, Any], emit: Emit) -> str:
    result = await session.client.list_users(
        session.application_id,
        page=int(args.get('page', 1)),
        page_size=int(args.get('page_size', 20)),
        search_term=args.get('search_term'),
        activity_status=args.get('activity_status'),
    )
    rows = result.get('Users') or []
    await emit({'type': 'users', 'rows': rows})
    total = result.get('TotalUsers', len(rows))
    page = result.get('CurrentPage', args.get('page', 1))
    pages = result.get('TotalPages', 1)
    preview = ', '.join(_label(user) for user in rows[:5])
    return f'{total} user(s), page {page} of {pages}. On this page: {preview or "none"}.'


async def _find_user(session: Session, args: dict[str, Any], emit: Emit) -> str:
    user = await session.client.find_user(
        device_token=args.get('device_token'),
        email=args.get('email'),
        phone=args.get('phone'),
        client_id=args.get('client_id'),
        full_name=args.get('full_name'),
    )
    if not user:
        return 'No matching user found.'
    return json.dumps(_compact(user))


async def _count_users(session: Session, args: dict[str, Any], emit: Emit) -> str:
    count = await session.client.count_users(
        session.application_id,
        is_enabled=args.get('is_enabled'),
        is_tracking_enabled=args.get('is_tracking_enabled'),
        include_deactivated=args.get('include_deactivated'),
    )
    return f'{count} matching user(s).'


async def _set_user_status(session: Session, args: dict[str, Any], emit: Emit) -> str:
    await session.client.set_user_status(args['device_token'], args['status'])
    return f'Status set to {args["status"]}.'


async def _set_sdk_settings(session: Session, args: dict[str, Any], emit: Emit) -> str:
    user = await session.client.find_user(device_token=args['device_token'])
    instance_id = _instance_id(user)
    if not instance_id:
        return 'Could not resolve the SDK instance for that user.'
    flags = {label: args[key] for key, label in SDK_FLAGS.items() if key in args}
    if not flags:
        return 'No settings were provided to change.'
    await session.client.set_sdk_settings(instance_id, flags)
    return 'SDK settings updated.'


async def _delete_user(session: Session, args: dict[str, Any], emit: Emit) -> str:
    await session.client.delete_user(args['device_token'])
    return 'User deleted.'


_HANDLERS: dict[str, Callable[[Session, dict[str, Any], Emit], Awaitable[str]]] = {
    'list_users': _list_users,
    'find_user': _find_user,
    'count_users': _count_users,
    'set_user_status': _set_user_status,
    'set_sdk_settings': _set_sdk_settings,
    'delete_user': _delete_user,
}


def _label(user: dict[str, Any]) -> str:
    fields = user.get('UserFields') or [{}]
    client_id = fields[0].get('ClientId') if fields else None
    return client_id or _short(user.get('DeviceToken')) or 'unknown'


def _compact(user: dict[str, Any]) -> dict[str, Any]:
    profile = user.get('UserProfile') or {}
    account = user.get('AccountInfo') or {}
    return {
        'DeviceToken': user.get('DeviceToken'),
        'Status': user.get('Status'),
        'ActivityStatus': user.get('ActivityStatus'),
        'Name': ' '.join(filter(None, [profile.get('FirstName'), profile.get('LastName')])) or None,
        'Email': profile.get('Email'),
        'Phone': profile.get('Phone'),
        'Application': account.get('ApplicationName'),
        'Instance': account.get('InstanceName'),
    }


def _instance_id(user: dict[str, Any]) -> str | None:
    if not user:
        return None
    account = user.get('AccountInfo') or {}
    return user.get('InstanceId') or account.get('InstanceId') or account.get('Id')


def _short(token: Any) -> str | None:
    if not isinstance(token, str):
        return None
    return f'{token[:8]}…' if len(token) > 8 else token
