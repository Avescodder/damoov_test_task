from typing import Any

import httpx


class TelematicsError(Exception):
    pass


class TelematicsClient:
    def __init__(self, base_url: str, token: str) -> None:
        self._http = httpx.AsyncClient(
            base_url=base_url,
            timeout=httpx.Timeout(30.0),
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        )

    async def aclose(self) -> None:
        await self._http.aclose()

    async def list_users(
        self,
        application_id: str,
        page: int = 1,
        page_size: int = 20,
        search_term: str | None = None,
        activity_status: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            'ApplicationIds': [application_id],
            'PageNumber': page,
            'PageSize': page_size,
            'IncludeAccountInfo': True,
        }
        if search_term:
            body['SearchTerm'] = search_term
        if activity_status:
            body['ActivityStatus'] = activity_status
        resp = await self._http.post('/v1/Management/users/GetFilteredPage', json=body)
        return self._unwrap(resp) or {}

    async def find_user(self, **filters: str | None) -> dict[str, Any] | None:
        params: dict[str, str] = {'IncludeAccountInfo': 'true'}
        keys = {
            'device_token': 'DeviceToken',
            'email': 'Email',
            'phone': 'Phone',
            'client_id': 'ClientId',
            'full_name': 'FullName',
        }
        for key, value in filters.items():
            if value:
                params[keys[key]] = value
        resp = await self._http.get('/v1/Management/users/find', params=params)
        result = self._unwrap(resp)
        if isinstance(result, list):
            result = result[0] if result else None
        return result if isinstance(result, dict) else None

    async def count_users(
        self,
        application_id: str,
        is_enabled: bool | None = None,
        is_tracking_enabled: bool | None = None,
        include_deactivated: bool | None = None,
    ) -> int:
        body: dict[str, Any] = {'Identifiers': {'ApplicationIds': [application_id]}}
        if is_enabled is not None:
            body['IsEnabled'] = is_enabled
        if is_tracking_enabled is not None:
            body['IsTrackingEnabled'] = is_tracking_enabled
        if include_deactivated is not None:
            body['IncludeDeactivated'] = include_deactivated
        result = self._unwrap(await self._http.post('/v1/Management/users/count', json=body))
        if isinstance(result, dict):
            for key in ('Count', 'TotalUsers', 'Total'):
                if isinstance(result.get(key), int):
                    return result[key]
            return 0
        return result if isinstance(result, int) else 0

    async def set_user_status(self, device_token: str, status: str) -> dict[str, Any]:
        resp = await self._http.put(
            '/v1/Management/users',
            headers={'UserDeviceToken': device_token},
            json={'Status': status},
        )
        return self._unwrap(resp) or {}

    async def set_sdk_settings(self, instance_id: str, settings: dict[str, bool]) -> dict[str, Any]:
        resp = await self._http.patch(
            f'/v1/Management/users/instances/{instance_id}/sdk', json=settings
        )
        return self._unwrap(resp) or {}

    async def delete_user(self, device_token: str) -> dict[str, Any]:
        resp = await self._http.delete(f'/v1/Management/users/{device_token}')
        return self._unwrap(resp) or {}

    def _unwrap(self, resp: httpx.Response) -> Any:
        try:
            payload = resp.json()
        except ValueError:
            payload = None

        if isinstance(payload, dict):
            errors = payload.get('Errors') or []
            if errors:
                raise TelematicsError(self._message(errors, payload))
            if resp.is_error:
                raise TelematicsError(payload.get('Title') or f'Request failed ({resp.status_code}).')
            return payload.get('Result')

        if resp.is_error:
            raise TelematicsError(f'Request failed ({resp.status_code}).')
        return payload

    @staticmethod
    def _message(errors: list[dict[str, Any]], payload: dict[str, Any]) -> str:
        for error in errors:
            if error.get('Message'):
                return error['Message']
        return payload.get('Title') or 'The telematics API rejected the request.'
