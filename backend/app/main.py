import os
from typing import Annotated
from decimal import Decimal
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .database import DomainError, Store
from .models import Credentials, Restock, SessionOut, UserOut, VehicleCreate, VehicleDetails, VehicleOut
from .security import create_token, dummy_hash, password_hasher, token_user_id


def create_app(db_path=None, secret=None):
    load_dotenv()
    secret = secret if secret is not None else os.getenv("JWT_SECRET", "")
    if len(secret) < 32 or secret.startswith("replace-with"):
        raise ValueError("Set JWT_SECRET to a random secret of at least 32 characters")
    store = Store(db_path or os.getenv("DATABASE_PATH", "./inventory.db"))
    app = FastAPI(title="Motorlane Car Inventory", version="1.0.0")
    app.add_middleware(CORSMiddleware, allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
                       allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Authorization", "Content-Type"])
    bearer = HTTPBearer(auto_error=False)

    @app.exception_handler(DomainError)
    async def domain_error_handler(_request, error):
        return JSONResponse(status_code=error.status, content={"detail": error.detail})

    def current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
        error = HTTPException(401, "Please log in to continue", headers={"WWW-Authenticate": "Bearer"})
        if not credentials:
            raise error
        try:
            user_id = token_user_id(credentials.credentials, secret)
            if user_id < 1 or user_id > 2**63 - 1:
                raise ValueError("Invalid user id")
            user = store.user_by_id(user_id)
        except (jwt.InvalidTokenError, ValueError, TypeError):
            raise error
        if not user:
            raise error
        return user

    def admin(user: Annotated[dict, Depends(current_user)]):
        if user["role"] != "admin":
            raise HTTPException(403, "Administrator access is required")
        return user

    def session(user):
        return {"access_token": create_token(user["id"], secret), "user": user}

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.post("/api/auth/register", status_code=201, response_model=SessionOut)
    def register(data: Credentials):
        return session(store.create_user(str(data.email), password_hasher.hash(data.password)))

    @app.post("/api/auth/login", response_model=SessionOut)
    def login(data: Credentials):
        user = store.user_by_email(str(data.email))
        valid = password_hasher.verify(data.password, user["password_hash"] if user else dummy_hash)
        if not user or not valid:
            raise HTTPException(401, "Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
        return session(user)

    @app.get("/api/auth/me", response_model=UserOut)
    def me(user: Annotated[dict, Depends(current_user)]):
        return user

    @app.get("/api/vehicles", response_model=list[VehicleOut], dependencies=[Depends(current_user)])
    def list_vehicles():
        return store.list_vehicles()

    @app.get("/api/vehicles/search", response_model=list[VehicleOut], dependencies=[Depends(current_user)])
    def search(make: Annotated[str | None, Query(max_length=80)] = None,
               model: Annotated[str | None, Query(max_length=80)] = None,
               category: Annotated[str | None, Query(max_length=80)] = None,
               min_price: Annotated[Decimal | None, Query(ge=0, le=999_999_999, decimal_places=2, allow_inf_nan=False)] = None,
               max_price: Annotated[Decimal | None, Query(ge=0, le=999_999_999, decimal_places=2, allow_inf_nan=False)] = None):
        if min_price is not None and max_price is not None and min_price > max_price:
            raise HTTPException(422, "Minimum price cannot exceed maximum price")
        return store.list_vehicles(make, model, category, min_price, max_price)

    @app.post("/api/vehicles", status_code=201, response_model=VehicleOut, dependencies=[Depends(admin)])
    def create_vehicle(data: VehicleCreate):
        return store.create_vehicle(data)

    @app.put("/api/vehicles/{vehicle_id}", response_model=VehicleOut, dependencies=[Depends(admin)])
    def update_vehicle(vehicle_id: int, data: VehicleDetails):
        return store.update_vehicle(vehicle_id, data)

    @app.delete("/api/vehicles/{vehicle_id}", status_code=204, dependencies=[Depends(admin)])
    def delete_vehicle(vehicle_id: int):
        store.delete_vehicle(vehicle_id)
        return Response(status_code=204)

    @app.post("/api/vehicles/{vehicle_id}/purchase", response_model=VehicleOut, dependencies=[Depends(current_user)])
    def purchase(vehicle_id: int):
        return store.purchase(vehicle_id)

    @app.post("/api/vehicles/{vehicle_id}/restock", response_model=VehicleOut, dependencies=[Depends(admin)])
    def restock(vehicle_id: int, data: Restock):
        return store.restock(vehicle_id, data.quantity)

    return app
