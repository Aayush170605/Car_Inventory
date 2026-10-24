import pytest
import sqlite3
from fastapi.testclient import TestClient
from app.main import create_app

SECRET = "test-secret-that-is-at-least-32-characters-long"
ACCOUNT = {"email": "buyer@example.com", "password": "SensiblePassword123!"}


@pytest.fixture
def database(tmp_path):
    return str(tmp_path / "test.db")


@pytest.fixture
def client(database):
    with TestClient(create_app(db_path=database, secret=SECRET)) as client:
        yield client


@pytest.fixture
def headers(client):
    response = client.post("/api/auth/register", json=ACCOUNT)
    return {"Authorization": "Bearer " + response.json()["access_token"]}


@pytest.fixture
def admin(client, database):
    result = client.post("/api/auth/register", json={**ACCOUNT, "email": "admin@example.com"}).json()
    with sqlite3.connect(database) as db:
        db.execute("UPDATE users SET role='admin' WHERE email='admin@example.com'")
    return {"Authorization": "Bearer " + result["access_token"]}


@pytest.fixture
def vehicle(client, admin):
    return client.post("/api/vehicles", headers=admin, json={
        "make": "Toyota", "model": "Camry", "category": "Sedan", "price": "25000.99", "quantity": 3
    }).json()
