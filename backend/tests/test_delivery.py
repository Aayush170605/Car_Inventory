from fastapi.testclient import TestClient
import pytest
from app.main import create_app
from tests.conftest import SECRET


@pytest.mark.parametrize('vehicle_id', [0, -1, 2**63])
@pytest.mark.parametrize('method,suffix,body', [
    ('post', '/purchase', None),
    ('post', '/restock', {'quantity': 1}),
    ('delete', '', None),
    ('put', '', {'make': 'Toyota', 'model': 'Camry', 'category': 'Sedan', 'price': '100'}),
])
def test_vehicle_identifiers_are_validated(client, admin, vehicle_id, method, suffix, body):
    response = client.request(method, f'/api/vehicles/{vehicle_id}{suffix}', headers=admin, json=body)
    assert response.status_code == 422


def test_production_serves_frontend_without_overriding_api(tmp_path, monkeypatch, database):
    frontend = tmp_path / 'dist'
    frontend.mkdir()
    (frontend / 'index.html').write_text('<html><body>Motorlane</body></html>')
    (frontend / 'asset.js').write_text('console.log("loaded")')
    monkeypatch.setenv('FRONTEND_DIST', str(frontend))
    with TestClient(create_app(db_path=database, secret=SECRET)) as client:
        assert client.get('/').status_code == 200
        assert 'Motorlane' in client.get('/').text
        assert client.get('/asset.js').status_code == 200
        assert client.get('/api/health').json() == {'status': 'ok'}
        assert client.get('/api/vehicles').status_code == 401
        assert client.get('/api/nonexistent').status_code == 404
