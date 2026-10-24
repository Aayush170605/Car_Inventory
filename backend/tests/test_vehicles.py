import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from tests.conftest import SECRET

PAYLOAD = {"make": "Toyota", "model": "Camry", "category": "Sedan", "price": "25000.99", "quantity": 3}


def test_create_list_and_persist(client, admin, database):
    created = client.post("/api/vehicles", headers=admin, json=PAYLOAD)
    assert created.status_code == 201
    car = created.json()
    assert car["price"] == "25000.99"
    assert car["quantity"] == 3
    with TestClient(create_app(db_path=database, secret=SECRET)) as restarted:
        assert restarted.get("/api/vehicles", headers=admin).json() == [car]


def test_update_details_and_delete(client, admin, vehicle):
    url = f'/api/vehicles/{vehicle["id"]}'
    response = client.put(url, headers=admin, json={k: v for k, v in {**PAYLOAD, "price": "24000.01"}.items() if k != "quantity"})
    assert response.status_code == 200
    assert response.json()["price"] == "24000.01"
    assert response.json()["quantity"] == 3
    assert client.delete(url, headers=admin).status_code == 204
    assert client.get("/api/vehicles", headers=admin).json() == []


@pytest.mark.parametrize("query, count", [
    ({"make": "TOY"}, 1), ({"model": "amr"}, 1), ({"category": "sedan"}, 1),
    ({"min_price": "25000.99", "max_price": "25000.99"}, 1),
    ({"min_price": "25001"}, 0), ({"max_price": "25000"}, 0),
    ({"make": "Honda"}, 0), ({"make": "Toyota", "model": "Civic"}, 0),
    ({"make": "' OR 1=1 --"}, 0),
])
def test_search_filters_combine_and_use_boundaries(client, headers, vehicle, query, count):
    response = client.get("/api/vehicles/search", headers=headers, params=query)
    assert response.status_code == 200
    assert len(response.json()) == count


@pytest.mark.parametrize("changes", [
    {"price": "-1"}, {"price": "1.001"}, {"price": "NaN"},
    {"quantity": -1}, {"quantity": 1.5}, {"quantity": True},
    {"make": " "}, {"model": ""}, {"category": " "}, {"unexpected": 1},
])
def test_invalid_vehicle_is_rejected(client, admin, changes):
    assert client.post("/api/vehicles", headers=admin, json={**PAYLOAD, **changes}).status_code == 422


def test_reversed_price_range_is_rejected(client, headers):
    assert client.get("/api/vehicles/search?min_price=10&max_price=1", headers=headers).status_code == 422


@pytest.mark.parametrize("method,path,payload", [
    ("get", "/api/vehicles", None), ("get", "/api/vehicles/search", None),
    ("post", "/api/vehicles", PAYLOAD), ("put", "/api/vehicles/1", PAYLOAD),
    ("delete", "/api/vehicles/1", None), ("post", "/api/vehicles/1/purchase", {}),
    ("post", "/api/vehicles/1/restock", {"quantity": 1}),
])
def test_all_inventory_endpoints_require_login(client, method, path, payload):
    assert client.request(method, path, json=payload).status_code == 401


@pytest.mark.parametrize("method,path,payload", [
    ("post", "/api/vehicles", PAYLOAD),
    ("put", "/api/vehicles/1", {k: v for k, v in PAYLOAD.items() if k != "quantity"}),
    ("delete", "/api/vehicles/1", None),
    ("post", "/api/vehicles/1/restock", {"quantity": 1}),
])
def test_customer_cannot_manage_inventory(client, headers, method, path, payload):
    assert client.request(method, path, headers=headers, json=payload).status_code == 403


def test_update_cannot_silently_overwrite_stock(client, admin, vehicle):
    assert client.put(f'/api/vehicles/{vehicle["id"]}', headers=admin, json=PAYLOAD).status_code == 422


def test_missing_vehicle_returns_404(client, admin):
    assert client.delete('/api/vehicles/999', headers=admin).status_code == 404
    assert client.put('/api/vehicles/999', headers=admin, json={k: v for k, v in PAYLOAD.items() if k != "quantity"}).status_code == 404
