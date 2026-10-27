"""
BuildBharat ERP - Authentication & Security Module
Provides cryptographic password hashing (PBKDF2-HMAC-SHA256 with 16-byte random salt),
constant-time password verification, and tamper-proof signed session tokens.
Zero external C-extension dependencies, fully cross-platform.
"""
import os
import hmac
import hashlib
import base64
import json
import time
from typing import Dict, Any, Optional

# Secret key for HMAC signature (configurable via environment, default fallback)
AUTH_SECRET_KEY = os.environ.get("BUILDBHARAT_AUTH_SECRET", "buildbharat-secret-token-key-2026-enterprise-auth-system")

# Display mappings for enterprise roles
ROLE_DISPLAY_MAP = {
    "OPERATIONS": "Managing Authority (Project Manager)",
    "FINANCE": "Finance Department (CFO / Accounts)",
    "SITE_STORE": "Site Storekeeper (Godown In-Charge)",
    "ADMIN": "System Administrator (Corporate Admin)",
    "SUPERADMIN": "Ostaad SuperAdmin",
    "LABOUR": "Labour / Subcontractor"
}

def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    """
    Hashes a plain password using PBKDF2-HMAC-SHA256 with 100,000 iterations.
    Format: 'pbkdf2_sha256$100000$salt_hex$hash_hex'
    """
    if salt is None:
        salt = os.urandom(16)
    
    key = hashlib.pbkdf2_hmac(
        hash_name="sha256",
        password=password.encode("utf-8"),
        salt=salt,
        iterations=100000,
        dklen=32
    )
    return f"pbkdf2_sha256$100000${salt.hex()}${key.hex()}"

def verify_password(plain_password: str, stored_hash: Optional[str]) -> bool:
    """
    Verifies a plain password against stored hash in constant time.
    """
    if not stored_hash or not plain_password:
        return False
    
    try:
        parts = stored_hash.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_key = bytes.fromhex(parts[3])
        
        computed_key = hashlib.pbkdf2_hmac(
            hash_name="sha256",
            password=plain_password.encode("utf-8"),
            salt=salt,
            iterations=iterations,
            dklen=32
        )
        return hmac.compare_digest(computed_key, expected_key)
    except Exception:
        return False

def create_session_token(user_id: str, email: str, role: str, expires_in_seconds: int = 86400 * 7) -> str:
    """
    Generates a signed, URL-safe base64 session token with expiry.
    """
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + expires_in_seconds
    }
    raw_payload = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(raw_payload).decode('utf-8').rstrip('=')
    
    # Signature
    signature = hmac.new(
        AUTH_SECRET_KEY.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"{payload_b64}.{signature}"

def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies token signature and checks expiration.
    Returns decoded payload if valid, None otherwise.
    """
    if not token or "." not in token:
        return None
    
    try:
        payload_b64, signature = token.split(".", 1)
        
        # Verify signature in constant time
        expected_sig = hmac.new(
            AUTH_SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        # Padding for base64 decode
        rem = len(payload_b64) % 4
        padded = payload_b64 + ('=' * (4 - rem) if rem else '')
        raw_payload = base64.urlsafe_b64decode(padded.encode('utf-8'))
        payload = json.loads(raw_payload.decode('utf-8'))
        
        # Expiration check
        if payload.get("exp", 0) < int(time.time()):
            return None
        
        return payload
    except Exception:
        return None
