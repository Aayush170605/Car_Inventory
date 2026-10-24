from concurrent.futures import ThreadPoolExecutor
import pytest


def test_purchase_decreases_stock_and_rejects_sold_out(client, headers, vehicle):
    url = f'/api/vehicles/{vehicle["id"]}/purchase'
    for remaining in (2, 1, 0):
        response = client.post(url, headers=headers)
        assert response.status_code == 200
        assert response.json()["quantity"] == remaining
    assert client.post(url, headers=headers).status_code == 409


def test_concurrent_purchases_never_oversell(client, headers, vehicle):
    def purchase(_):
        return client.post(f'/api/vehicles/{vehicle["id"]}/purchase', headers=headers).status_code
    with ThreadPoolExecutor(max_workers=8) as executor:
        statuses = list(executor.map(purchase, range(12)))
    assert statuses.count(200) == 3
    assert statuses.count(409) == 9
    assert client.get('/api/vehicles', headers=headers).json()[0]['quantity'] == 0


def test_restock_increases_quantity(client, admin, vehicle):
    response = client.post(f'/api/vehicles/{vehicle["id"]}/restock', headers=admin, json={"quantity": 7})
    assert response.status_code == 200
    assert response.json()["quantity"] == 10


@pytest.mark.parametrize("quantity", [0, -1, 1.5, True, 1000001])
def test_invalid_restock_is_rejected(client, admin, vehicle, quantity):
    assert client.post(f'/api/vehicles/{vehicle["id"]}/restock', headers=admin, json={"quantity": quantity}).status_code == 422


def test_stock_limit_is_enforced(client, admin, vehicle):
    assert client.post(f'/api/vehicles/{vehicle["id"]}/restock', headers=admin, json={"quantity": 1000000}).status_code == 409


def test_missing_vehicle_returns_404(client, admin):
    assert client.post('/api/vehicles/999/purchase', headers=admin).status_code == 404
    assert client.post('/api/vehicles/999/restock', headers=admin, json={"quantity": 1}).status_code == 404
