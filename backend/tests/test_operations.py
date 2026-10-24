import sqlite3
from datetime import datetime, timedelta, timezone
import jwt
import pytest
from app import cli
from app.database import Store
from app.security import password_hasher
from tests.conftest import SECRET


def test_health(client):
    assert client.get('/api/health').json() == {'status': 'ok'}


def test_memory_database_is_rejected():
    with pytest.raises(ValueError, match='file-backed'):
        Store(':memory:')


def test_deleted_user_token_is_invalid(client, headers, database):
    with sqlite3.connect(database) as db:
        db.execute('DELETE FROM users')
    assert client.get('/api/auth/me', headers=headers).status_code == 401


@pytest.mark.parametrize('subject,secret', [('invalid', SECRET), ('999999999999999999999999999999', SECRET), ('1', 'wrong-secret-that-is-at-least-32-characters')])
def test_malformed_subject_and_bad_signature(client, subject, secret):
    now = datetime.now(timezone.utc)
    token = jwt.encode({'sub': subject, 'iat': now, 'exp': now + timedelta(hours=1), 'iss': 'car-inventory', 'aud': 'car-inventory-web'}, secret, algorithm='HS256')
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + token}).status_code == 401


def test_role_changes_take_effect_without_reissuing_token(client, admin, database):
    with sqlite3.connect(database) as db:
        db.execute("UPDATE users SET role='customer'")
    assert client.delete('/api/vehicles/1', headers=admin).status_code == 403


def test_seed_command_is_repeatable_without_duplicates(monkeypatch, database, capsys):
    monkeypatch.setenv('DATABASE_PATH', database)
    monkeypatch.setattr('sys.argv', ['cli', 'seed'])
    cli.main()
    assert len(Store(database).list_vehicles()) == 6
    with pytest.raises(SystemExit) as error:
        cli.main()
    assert error.value.code == 0
    assert len(Store(database).list_vehicles()) == 6


def test_promote_command_requires_registered_account(monkeypatch, database):
    monkeypatch.setenv('DATABASE_PATH', database)
    monkeypatch.setattr('sys.argv', ['cli', 'promote', 'admin@example.com'])
    with pytest.raises(SystemExit) as error:
        cli.main()
    assert error.value.code == 1
    store = Store(database)
    store.create_user('admin@example.com', password_hasher.hash('SensiblePassword123!'))
    cli.main()
    assert store.user_by_email('admin@example.com')['role'] == 'admin'
