import asyncio

import httpx

from app.telematics.client import TelematicsClient


def _client(handler):
    client = TelematicsClient('https://api.test', 'token')
    client._http = httpx.AsyncClient(
        base_url='https://api.test', transport=httpx.MockTransport(handler)
    )
    return client


def _envelope(result):
    return {'Result': result, 'Status': 200, 'Title': '', 'Errors': []}


def test_find_user_unwraps_a_list_result_to_the_first_match():
    client = _client(lambda request: httpx.Response(200, json=_envelope([{'DeviceToken': 'd1'}, {'DeviceToken': 'd2'}])))
    assert asyncio.run(client.find_user(device_token='d1')) == {'DeviceToken': 'd1'}


def test_find_user_returns_none_for_an_empty_list():
    client = _client(lambda request: httpx.Response(200, json=_envelope([])))
    assert asyncio.run(client.find_user(device_token='missing')) is None


def test_find_user_passes_a_dict_result_through():
    client = _client(lambda request: httpx.Response(200, json=_envelope({'DeviceToken': 'd1'})))
    assert asyncio.run(client.find_user(device_token='d1')) == {'DeviceToken': 'd1'}
