import os
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding as rsa_padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from pqcrypto.kem.ml_kem_1024 import generate_keypair, encrypt as kyb_encap, decrypt as kyb_decap

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


KEYS_DIR = Path("keys")
KEYS_DIR.mkdir(exist_ok=True)

RSA_PRIV_PATH = KEYS_DIR / "rsa_private.pem"
RSA_PUB_PATH  = KEYS_DIR / "rsa_public.pem"

KYB_PUB_PATH  = KEYS_DIR / "kyber_public.key"
KYB_PRIV_PATH = KEYS_DIR / "kyber_private.key"

def load_or_create_rsa_keys():
    if RSA_PRIV_PATH.exists() and RSA_PUB_PATH.exists():
        priv_pem = RSA_PRIV_PATH.read_bytes()
        pub_pem  = RSA_PUB_PATH.read_bytes()
        rsa_private = serialization.load_pem_private_key(priv_pem, password=None)
        rsa_public  = serialization.load_pem_public_key(pub_pem)
        return rsa_private, rsa_public

    rsa_private = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    rsa_public  = rsa_private.public_key()

    RSA_PRIV_PATH.write_bytes(
        rsa_private.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    RSA_PUB_PATH.write_bytes(
        rsa_public.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )
    return rsa_private, rsa_public


def load_or_create_kyber_keys():
    if KYB_PUB_PATH.exists() and KYB_PRIV_PATH.exists():
        return KYB_PUB_PATH.read_bytes(), KYB_PRIV_PATH.read_bytes()

    kyb_public, kyb_private = generate_keypair()
    KYB_PUB_PATH.write_bytes(kyb_public)
    KYB_PRIV_PATH.write_bytes(kyb_private)
    return kyb_public, kyb_private


RSA_PRIVATE, RSA_PUBLIC = load_or_create_rsa_keys()
KYB_PUBLIC, KYB_PRIVATE = load_or_create_kyber_keys()

MAGIC = b"HYBRID1"
INFO = b"company-file-encryption-v1"

def _derive_aes_key(data_key: bytes, kyber_shared_secret: bytes) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=INFO,
    )
    return hkdf.derive(data_key + kyber_shared_secret)

def encrypt_bytes(plaintext: bytes) -> bytes:
    # per-file random key
    data_key = os.urandom(32)

    # RSA wrap data key
    rsa_ciphertext = RSA_PUBLIC.encrypt(
        data_key,
        rsa_padding.OAEP(
            mgf=rsa_padding.MGF1(hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    # Kyber encapsulation
    kyber_ciphertext, kyber_shared_secret = kyb_encap(KYB_PUBLIC)

    # derive AES-256 key
    aes_key = _derive_aes_key(data_key, kyber_shared_secret)

    # AES-GCM
    nonce = os.urandom(12)
    aesgcm = AESGCM(aes_key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    out = io.BytesIO()
    out.write(MAGIC)
    out.write(len(rsa_ciphertext).to_bytes(4, "big"))
    out.write(rsa_ciphertext)
    out.write(len(kyber_ciphertext).to_bytes(4, "big"))
    out.write(kyber_ciphertext)
    out.write(nonce)
    out.write(ciphertext)
    return out.getvalue()

def decrypt_bytes(blob: bytes) -> bytes:
    f = io.BytesIO(blob)
    magic = f.read(len(MAGIC))
    if magic != MAGIC:
        raise ValueError("Invalid file format (magic mismatch)")

    rsa_len = int.from_bytes(f.read(4), "big")
    rsa_ciphertext = f.read(rsa_len)

    kyber_len = int.from_bytes(f.read(4), "big")
    kyber_ciphertext = f.read(kyber_len)

    nonce = f.read(12)
    ciphertext = f.read()

    data_key = RSA_PRIVATE.decrypt(
        rsa_ciphertext,
        rsa_padding.OAEP(
            mgf=rsa_padding.MGF1(hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    kyber_shared_secret = kyb_decap(KYB_PRIVATE, kyber_ciphertext)

    aes_key = _derive_aes_key(data_key, kyber_shared_secret)

    aesgcm = AESGCM(aes_key)
    return aesgcm.decrypt(nonce, ciphertext, None)

@app.post("/encrypt")
async def encrypt_api(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    enc = encrypt_bytes(data)

    out_name = (file.filename or "file") + ".enc"
    return StreamingResponse(
        io.BytesIO(enc),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
    )

@app.post("/decrypt")
async def decrypt_api(file: UploadFile = File(...)):
    blob = await file.read()
    if not blob:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        plain = decrypt_bytes(blob)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decrypt failed: {str(e)}")

    name = file.filename or "decrypted"
    if name.endswith(".enc"):
        name = name[:-4]
    else:
        name = name + ".out"

    return StreamingResponse(
        io.BytesIO(plain),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )
