import sqlite3
from datetime import datetime, timedelta, timezone
import jwt
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from conftest import ACCOUNT, SECRET


def test_registration_returns_token_and_customer_without_password(client, database):
    response = client.post("/api/auth/register", json=ACCOUNT)
    assert response.status_code == 201
    result = response.json()
    assert result["token_type"] == "bearer"
    assert result["user"]["role"] == "customer"
    assert result["user"]["email"] == ACCOUNT["email"]
    assert "password" not in result["user"]
    with sqlite3.connect(database) as db:
        stored = db.execute("SELECT password_hash FROM users").fetchone()[0]
    assert stored != ACCOUNT["password"]
    assert stored.startswith("$argon2id$")


def test_duplicate_email_is_case_insensitive(client):
    client.post("/api/auth/register", json=ACCOUNT)
    assert client.post("/api/auth/register", json={**ACCOUNT, "email": "BUYER@example.com"}).status_code == 409


def test_login_and_persistence_across_app_instances(client, database):
    client.post("/api/auth/register", json=ACCOUNT)
    with TestClient(create_app(db_path=database, secret=SECRET)) as restarted:
        response = restarted.post("/api/auth/login", json=ACCOUNT)
    assert response.status_code == 200
    assert response.json()["access_token"]


@pytest.mark.parametrize("payload", [
    {**ACCOUNT, "password": "short"},
    {**ACCOUNT, "email": "invalid"},
    {**ACCOUNT, "role": "admin"},
])
def test_registration_rejects_invalid_input_and_role_escalation(client, payload):
    assert client.post("/api/auth/register", json=payload).status_code == 422


@pytest.mark.parametrize("payload", [ACCOUNT, {**ACCOUNT, "password": "WrongPassword123!"}])
def test_bad_login_is_generic(client, payload):
    if payload != ACCOUNT:
        client.post("/api/auth/register", json=ACCOUNT)
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_authenticated_profile(client, headers):
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["role"] == "customer"


@pytest.mark.parametrize("token", [None, "invalid", jwt.encode({
    "sub": "1", "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    "iat": datetime.now(timezone.utc) - timedelta(hours=2),
    "iss": "car-inventory", "aud": "car-inventory-web"
}, SECRET, algorithm="HS256")])
def test_missing_invalid_and_expired_tokens_are_rejected(client, token):
    headers = {"Authorization": "Bearer " + token} if token else {}
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_weak_secret_is_rejected(database):
    with pytest.raises(ValueError, match="32"):
        create_app(db_path=database, secret="short")
