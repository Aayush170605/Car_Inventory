from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()
# Verify a real hash for unknown accounts to reduce timing differences.
dummy_hash = password_hasher.hash("not-a-real-account-password")


def create_token(user_id: int, secret: str):
    now = datetime.now(timezone.utc)
    return jwt.encode({
        "sub": str(user_id), "iat": now, "exp": now + timedelta(hours=1),
        "iss": "car-inventory", "aud": "car-inventory-web",
    }, secret, algorithm="HS256")


def token_user_id(token: str, secret: str):
    claims = jwt.decode(token, secret, algorithms=["HS256"], audience="car-inventory-web",
                        issuer="car-inventory", options={"require": ["sub", "exp", "iat", "iss", "aud"]})
    return int(claims["sub"])
