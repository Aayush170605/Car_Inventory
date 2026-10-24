import sqlite3
from contextlib import contextmanager
from decimal import Decimal
from pathlib import Path
from .models import MAX_STOCK, VehicleCreate, VehicleDetails


class DomainError(Exception):
    def __init__(self, status: int, detail: str):
        self.status, self.detail = status, detail


class Store:
    """A small repository with one connection per operation and disk persistence."""

    def __init__(self, path: str):
        if path == ":memory:":
            raise ValueError("Use a file-backed SQLite database")
        self.path = str(Path(path).expanduser().resolve())
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin','customer'))
                );
                CREATE TABLE IF NOT EXISTS vehicles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    make TEXT NOT NULL, model TEXT NOT NULL, category TEXT NOT NULL,
                    price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
                    quantity INTEGER NOT NULL CHECK(quantity BETWEEN 0 AND 1000000)
                );
            """)

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def create_user(self, email: str, password_hash: str):
        try:
            with self.connection() as db:
                return dict(db.execute(
                    "INSERT INTO users(email,password_hash) VALUES (?,?) RETURNING id,email,role",
                    (email.lower(), password_hash),
                ).fetchone())
        except sqlite3.IntegrityError as error:
            raise DomainError(409, "An account with this email already exists") from error

    def user_by_email(self, email: str):
        with self.connection() as db:
            row = db.execute("SELECT * FROM users WHERE email=?", (email.lower(),)).fetchone()
            return dict(row) if row else None

    def user_by_id(self, user_id: int):
        with self.connection() as db:
            row = db.execute("SELECT id,email,role FROM users WHERE id=?", (user_id,)).fetchone()
            return dict(row) if row else None

    def promote(self, email: str):
        with self.connection() as db:
            if not db.execute("UPDATE users SET role='admin' WHERE email=?", (email.lower(),)).rowcount:
                raise DomainError(404, "Register this user before promoting them")

    @staticmethod
    def vehicle(row):
        if row is None:
            raise DomainError(404, "Vehicle not found")
        result = dict(row)
        result["price"] = Decimal(result.pop("price_cents")) / 100
        result["price"] = result["price"].quantize(Decimal("0.01"))
        return result

    def create_vehicle(self, details: VehicleCreate):
        with self.connection() as db:
            row = db.execute(
                "INSERT INTO vehicles(make,model,category,price_cents,quantity) VALUES (?,?,?,?,?) RETURNING *",
                (details.make, details.model, details.category, int(details.price * 100), details.quantity),
            ).fetchone()
            return self.vehicle(row)

    def list_vehicles(self, make=None, model=None, category=None, min_price=None, max_price=None):
        clauses, values = [], []
        for field, value in (("make", make), ("model", model), ("category", category)):
            if value:
                # Field names are fixed above. Values are always parameterized.
                clauses.append(f"instr(lower({field}),lower(?)) > 0")
                values.append(value.strip())
        for operator, price in ((">=", min_price), ("<=", max_price)):
            if price is not None:
                clauses.append(f"price_cents {operator} ?")
                values.append(int(price * 100))
        where = " WHERE " + " AND ".join(clauses) if clauses else ""
        with self.connection() as db:
            return [self.vehicle(row) for row in db.execute("SELECT * FROM vehicles" + where + " ORDER BY id DESC", values)]

    def update_vehicle(self, vehicle_id: int, details: VehicleDetails):
        with self.connection() as db:
            return self.vehicle(db.execute(
                "UPDATE vehicles SET make=?,model=?,category=?,price_cents=? WHERE id=? RETURNING *",
                (details.make, details.model, details.category, int(details.price * 100), vehicle_id),
            ).fetchone())

    def delete_vehicle(self, vehicle_id: int):
        with self.connection() as db:
            if not db.execute("DELETE FROM vehicles WHERE id=?", (vehicle_id,)).rowcount:
                raise DomainError(404, "Vehicle not found")

    def purchase(self, vehicle_id: int):
        with self.connection() as db:
            # Lock before both the conditional write and failure classification.
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "UPDATE vehicles SET quantity=quantity-1 WHERE id=? AND quantity>0 RETURNING *", (vehicle_id,)
            ).fetchone()
            if row is not None:
                return self.vehicle(row)
            if not db.execute("SELECT id FROM vehicles WHERE id=?", (vehicle_id,)).fetchone():
                raise DomainError(404, "Vehicle not found")
            raise DomainError(409, "This vehicle is out of stock")

    def restock(self, vehicle_id: int, quantity: int):
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "UPDATE vehicles SET quantity=quantity+? WHERE id=? AND quantity+?<=? RETURNING *",
                (quantity, vehicle_id, quantity, MAX_STOCK),
            ).fetchone()
            if row is not None:
                return self.vehicle(row)
            if not db.execute("SELECT id FROM vehicles WHERE id=?", (vehicle_id,)).fetchone():
                raise DomainError(404, "Vehicle not found")
            raise DomainError(409, "Stock limit exceeded")
