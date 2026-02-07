# PalTechDome – Hybrid Post-Quantum Encryption Demo
Full-stack proof-of-concept demonstrating hybrid encryption using classical and post-quantum cryptography for secure file protection.
This system shows how real applications can combine traditional encryption with post-quantum algorithms to protect data against future quantum threats.

---

## Features :
- Upload any file
- CSV / Excel preview (frontend)
- Encrypt file → download `.enc`
- Decrypt `.enc` → restore original file
- Hybrid key establishment:
  - RSA-3072 (classical)
  - ML-KEM-1024 / Kyber (post-quantum)
- AES-256-GCM for file encryption

---

## Tech Stack :
**Frontend**
- React (Vite)
- File preview (CSV/Excel)
- Fetch API

**Backend**
- FastAPI (Python)
- `cryptography` + `pqcrypto` (ML-KEM / Kyber)

---

## Project Structure :
backend/
frontend/
README.md
.gitignore
