from app.agent import tools


def test_reads_and_writes_are_classified():
    assert tools.is_write('set_user_status')
    assert tools.is_write('set_sdk_settings')
    assert tools.is_write('delete_user')
    assert not tools.is_write('list_users')
    assert not tools.is_write('find_user')
    assert not tools.is_write('count_users')


def test_every_schema_is_known_and_only_writes_mutate():
    names = {schema['function']['name'] for schema in tools.TOOL_SCHEMAS}
    assert names == set(tools._HANDLERS)
    assert tools.WRITE_TOOLS <= names


def test_summarize_write_describes_the_action():
    summary, details = tools.summarize_write(
        'set_user_status', {'device_token': 'f925d077-c835-40c1', 'status': 'Inactive'}
    )
    assert 'Inactive' in summary
    assert 'f925d077' in summary
    assert details['status'] == 'Inactive'

    delete_summary, _ = tools.summarize_write('delete_user', {'device_token': 'f925d077-c835'})
    assert 'Delete' in delete_summary
