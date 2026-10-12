from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import PyJWTError
from uuid import UUID
from pydantic import ValidationError
from app.db.session import get_db
from app.core.config import settings
from app.models.user import User

# Wait, OAuth2PasswordBearer normally takes x-www-form-urlencoded data which has username/password.
# Our spec says POST /api/v1/auth/login with request: email, password (usually json).
# So we'll use a custom bearer extraction or the built-in and handle JSON login ourselves.
# Using OAuth2PasswordBearer for dependency extraction only requires a bearer token in auth header.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data_sub = UUID(user_id)
    except (PyJWTError, ValidationError, ValueError):
        raise credentials_exception
    user = db.query(User).filter(User.id == token_data_sub).first()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return user
