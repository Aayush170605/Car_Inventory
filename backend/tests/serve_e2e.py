"""A loopback-only test server backed by a fresh, disposable database."""
from tempfile import TemporaryDirectory
import uvicorn
from app.cli import SAMPLES
from app.database import Store
from app.main import create_app
from app.models import VehicleCreate
from app.security import password_hasher


if __name__ == "__main__":
    with TemporaryDirectory(prefix="motorlane-e2e-") as folder:
        path = folder + "/test.db"
        store = Store(path)
        for email in ("admin@example.com", "customer@example.com"):
            store.create_user(email, password_hasher.hash("BrowserTestPassword123!"))
        store.promote("admin@example.com")
        for make, model, category, price, quantity in SAMPLES:
            store.create_vehicle(VehicleCreate(make=make, model=model, category=category, price=price, quantity=quantity))
        uvicorn.run(create_app(db_path=path, secret="disposable-e2e-secret-at-least-32-characters"), host="127.0.0.1", port=8001)
