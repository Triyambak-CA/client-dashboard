# CA Client Dashboard

A secure, centralised client management system built for Chartered Accountant (CA) firms. Manage client records, regulatory registrations, portal credentials, and organisational structure — all in one place.

---

## Features

- **Client Management** — Create and manage clients across multiple constitution types: Individual, Company, Partnership Firm, LLP, HUF, Trust, AOP, and BOI
- **Regulatory Registrations** — Track GST, EPF/ESI, MSME/Udyam, IEC, FSSAI, Professional Tax, and more
- **Credential Vault** — Encrypted storage for IT Portal, GST, MCA, TRACES, DSC, and bank net banking credentials
- **Organisational Structure** — Manage directors, shareholders, and partners with roles, ratios, and appointment details
- **Bank Accounts** — Store and organise client bank records with account types
- **Export** — Generate client reports as PDF or Excel
- **Role-Based Access** — Admin and Staff roles with JWT-based authentication

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Router      |
| Backend    | FastAPI (Python), SQLAlchemy ORM, Uvicorn       |
| Database   | PostgreSQL 15+                                  |
| Auth       | JWT (python-jose), bcrypt password hashing      |
| Encryption | Fernet symmetric encryption (cryptography)      |
| Deployment | Docker, Docker Compose, Nginx, Google Cloud     |
| CI/CD      | GitHub Actions                                  |

---

## Project Structure

```
client-dashboard/
├── backend/                # FastAPI application
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── crypto.py
│   ├── database.py
│   ├── routers/            # API route handlers
│   └── requirements.txt
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── utils/
│   └── package.json
├── database/
│   └── schema.sql          # PostgreSQL schema
├── .github/workflows/
│   └── deploy.yml          # CI/CD pipeline
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── .env.example
└── SETUP.md
```

---

## Getting Started (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 20+ (LTS)
- PostgreSQL 16

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE ca_clients;"
psql -U postgres -d ca_clients -f database/schema.sql
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env — see Environment Variables section below
python create_admin.py          # Create the initial admin user
python -m uvicorn main:app --reload
# Runs on http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) and log in with the admin credentials you created.

---

## Environment Variables

### `backend/.env`

| Variable                    | Description                                           |
|-----------------------------|-------------------------------------------------------|
| `DATABASE_URL`              | PostgreSQL connection string                          |
| `SECRET_KEY`                | 64-char hex string for JWT signing                    |
| `CREDENTIAL_ENCRYPTION_KEY` | Fernet key for encrypting stored credentials          |
| `ACCESS_TOKEN_EXPIRE_HOURS` | JWT token lifetime in hours (default: `8`)            |

**Generate keys:**

```bash
# SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# CREDENTIAL_ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Root `.env` (Docker deployment)

```
DB_PASSWORD=<PostgreSQL password>
SECRET_KEY=<same as backend>
CREDENTIAL_ENCRYPTION_KEY=<same as backend>
ACCESS_TOKEN_EXPIRE_HOURS=8
```

---

## Production Deployment

The app runs as a Docker stack: PostgreSQL + FastAPI backend + Nginx reverse proxy.

```bash
docker compose up -d --build
```

Nginx listens on port 80 and proxies API requests to FastAPI on port 8000. The React frontend is served as static files built into the Docker image.

### CI/CD (GitHub Actions)

Pushing to `main` triggers an automated deployment pipeline that:
1. Builds the React frontend
2. Copies the build artifacts to the GCE VM via SCP
3. SSHs into the VM, pulls latest code, regenerates `.env`, and runs `docker compose up -d --build`

**Required GitHub Secrets:**

| Secret                      | Description                          |
|-----------------------------|--------------------------------------|
| `GCE_HOST`                  | Google Compute Engine VM hostname    |
| `GCE_USER`                  | SSH username                         |
| `GCE_SSH_KEY`               | Private SSH key                      |
| `DB_PASSWORD`               | PostgreSQL password                  |
| `SECRET_KEY`                | JWT secret                           |
| `CREDENTIAL_ENCRYPTION_KEY` | Fernet encryption key                |

For a detailed step-by-step guide, see [SETUP.md](./SETUP.md).

---

## Security

- Passwords hashed with bcrypt
- Sensitive credentials encrypted with Fernet before storage
- JWT tokens expire after 8 hours
- Role separation: Admin users manage staff; Staff users manage clients
- All secrets loaded from environment variables — nothing hardcoded

---

## License

Private repository. All rights reserved.
