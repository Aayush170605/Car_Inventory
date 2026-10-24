from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field

MAX_STOCK = 1_000_000
Money = Annotated[Decimal, Field(ge=0, le=999_999_999, decimal_places=2, allow_inf_nan=False)]
Text = Annotated[str, Field(min_length=1, max_length=80)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Credentials(StrictModel):
    email: EmailStr
    # Password whitespace is significant, unlike vehicle fields and email.
    password: Annotated[str, Field(min_length=10, max_length=128)]
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)


class UserOut(BaseModel):
    id: int
    email: str
    role: Literal["admin", "customer"]


class SessionOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class VehicleDetails(StrictModel):
    make: Text
    model: Text
    category: Text
    price: Money


class VehicleCreate(VehicleDetails):
    quantity: Annotated[int, Field(strict=True, ge=0, le=MAX_STOCK)]


class VehicleOut(VehicleCreate):
    id: int


class Restock(StrictModel):
    quantity: Annotated[int, Field(strict=True, gt=0, le=MAX_STOCK)]
