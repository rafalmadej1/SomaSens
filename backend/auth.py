from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
import backend.models as models
import backend.database as database
from backend.config import get_settings

settings = get_settings()
SECRET_KEY = settings.jwt_secret_key

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
JWT_ISSUER = settings.jwt_issuer
JWT_AUDIENCE = settings.jwt_audience
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72

if SECRET_KEY == "your-super-secret-random-key-min-32-chars-change-me-in-production":
    raise ValueError("CRITICAL: JWT_SECRET_KEY must be a unique value at least 32 characters long.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
DUMMY_PASSWORD_HASH = pwd_context.hash("not-a-user-password")


def has_valid_password_length(password: str) -> bool:
    return (
        len(password) >= MIN_PASSWORD_LENGTH
        and len(password.encode("utf-8")) <= MAX_PASSWORD_BYTES
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update(
        {
            "aud": JWT_AUDIENCE,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "iss": JWT_ISSUER,
            "jti": str(uuid4()),
        }
    )
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
    except JWTError as exc:
        raise credentials_exception() from exc

    email = payload.get("sub")
    jti = payload.get("jti")
    if not isinstance(email, str) or not isinstance(jti, str):
        raise credentials_exception()
    return payload


def revoke_access_token(token: str, db: Session) -> None:
    payload = decode_access_token(token)
    expires_at = datetime.fromtimestamp(payload["exp"], timezone.utc)
    db.query(models.RevokedTokenDB).filter(
        models.RevokedTokenDB.expires_at <= datetime.now(timezone.utc)
    ).delete(synchronize_session=False)
    db.add(models.RevokedTokenDB(jti=payload["jti"], expires_at=expires_at))
    db.commit()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    payload = decode_access_token(token)
    if (
        db.query(models.RevokedTokenDB)
        .filter(models.RevokedTokenDB.jti == payload["jti"])
        .first()
    ):
        raise credentials_exception()

    email = payload["sub"]
    user = db.query(models.UserDB).filter(models.UserDB.email == email).first()
    if user is None:
        raise credentials_exception()
    return user
