"""
Ecomind Authentication Service — JWT Validation & Session Management
"""
from datetime import datetime, timedelta, timezone
import jwt
import bcrypt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
import os
from .user_db import user_db

# --- Security Config ---
# In a real app, this MUST be an environment variable. Using a fixed string for demonstration.
SECRET_KEY = os.getenv("ECOMIND_SECRET_KEY", "b47f9a2b0e68d141e9b89f0fd96c9e0a133d1b7201c13d7a8d9b233a1e944b56")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Password Hashing
# OAuth2 Scheme extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

    @staticmethod
    def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def get_current_user(token: str = Depends(oauth2_scheme)):
        """FastAPI Dependency for extracting and validating JWT tokens from requests."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
        except Exception:
            raise credentials_exception
            
        user = user_db.get_user(username)
        if user is None:
            raise credentials_exception
            
        return username
