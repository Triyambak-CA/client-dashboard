# CA Client Dashboard — Complete Architecture Document

> **Repository**: `Triyambak-CA/client-dashboard`
> **Live URL**: `http://clients.youwequest.com`
> **Last Updated**: 2026-03-06

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Database Architecture](#4-database-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Infrastructure & Deployment](#7-infrastructure--deployment)
8. [Security & Encryption](#8-security--encryption)
9. [API Reference](#9-api-reference)
10. [Environment Variables](#10-environment-variables)
11. [Implementation History](#11-implementation-history)
12. [Common Operations](#12-common-operations)

---

## 1. Project Overview

A **full-stack web application** for a Chartered Accountant (CA) firm to manage their client database. It tracks:

- **Client master records** — Individuals, Companies, LLPs, Partnerships, HUFs, Trusts, AOPs, BOIs
- **KYC & identity** — PAN, Aadhaar, DIN, passport, DSC details
- **Portal credentials** — IT Portal, TRACES, GST, E-Way Bill, MCA (all encrypted at rest)
- **GST registrations** with signatories
- **Directors, Shareholders, Partners** — linking Individual clients to Companies/Firms
- **Bank accounts** with net banking credentials
- **EPF/ESI registrations**
- **Other registrations** — MSME, IEC, FSSAI, Professional Tax, etc.
- **PDF & Excel export** of client profiles

---

## 2. Tech Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | FastAPI | 0.115.0 |
| Server | Uvicorn | 0.32.0 |
| ORM | SQLAlchemy | 2.0.36 |
| Database | PostgreSQL | 15 (Alpine) |
| Auth | python-jose (JWT) + passlib (bcrypt) | 3.3.0 / 1.7.4 |
| Encryption | cryptography (Fernet) | 43.0.3 |
| Validation | Pydantic v2 | 2.9.2 |
| Python | 3.11-slim (Docker) | |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.3.1 |
| Build Tool | Vite | 5.4.10 |
| Styling | Tailwind CSS | 3.4.14 |
| HTTP Client | Axios | 1.7.7 |
| Routing | React Router DOM | 6.27.0 |
| Icons | Lucide React | 0.454.0 |
| PDF Export | jsPDF + jspdf-autotable | 4.2.0 / 5.0.7 |
| Excel Export | xlsx (SheetJS) | 0.18.5 |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Hosting | Google Cloud VM (GCE) |
| Containerization | Docker Compose |
| Reverse Proxy | Nginx 1.29.5 (Alpine) |
| CI/CD | GitHub Actions |
| Domain | `clients.youwequest.com` |

---

## 3. Directory Structure

```
client-dashboard/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions CI/CD pipeline
├── backend/
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py                 # /api/auth/* endpoints
│   │   ├── clients.py              # /api/clients/* endpoints
│   │   ├── gst.py                  # /api/gst/* endpoints
│   │   ├── directors.py            # /api/directors/* endpoints
│   │   ├── shareholders.py         # /api/shareholders/* endpoints
│   │   ├── partners.py             # /api/partners/* endpoints
│   │   ├── bank_accounts.py        # /api/bank-accounts/* endpoints
│   │   ├── epf_esi.py              # /api/epf-esi/* endpoints
│   │   └── other_registrations.py  # /api/other-registrations/* endpoints
│   ├── main.py                     # FastAPI app entry point + SPA serving
│   ├── database.py                 # SQLAlchemy engine & session factory
│   ├── models.py                   # ORM models (10 tables)
│   ├── schemas.py                  # Pydantic request/response schemas
│   ├── auth.py                     # JWT authentication helpers
│   ├── crypto.py                   # Fernet encryption/decryption
│   ├── seed.py                     # DB schema init + admin user seed
│   ├── create_admin.py             # Standalone admin creation script
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # React Router configuration
│   │   ├── main.jsx                # React entry point
│   │   ├── api.js                  # Axios instance + all API methods
│   │   ├── index.css               # Tailwind directives + custom scrollbar
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx      # Auth state (JWT token, user info)
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Login form
│   │   │   ├── Dashboard.jsx        # Client list with search/filters
│   │   │   ├── ClientDetail.jsx     # Tabbed client profile view
│   │   │   └── ClientNew.jsx        # New client creation form
│   │   ├── components/
│   │   │   ├── Layout.jsx           # Sidebar + main content area
│   │   │   ├── Modal.jsx            # Reusable modal dialog
│   │   │   ├── ProtectedRoute.jsx   # Auth guard wrapper
│   │   │   ├── ClientForm.jsx       # Dynamic client create/edit form
│   │   │   ├── NewIndividualModal.jsx # Quick individual creation
│   │   │   ├── ExportMenu.jsx       # PDF/Excel export dropdown
│   │   │   └── tabs/
│   │   │       ├── BankTab.jsx       # Bank accounts CRUD
│   │   │       ├── DirectorsTab.jsx  # Directors management
│   │   │       ├── ShareholdersTab.jsx
│   │   │       ├── PartnersTab.jsx
│   │   │       ├── GSTTab.jsx        # GST + signatory management
│   │   │       ├── EPFESITab.jsx
│   │   │       └── OtherRegTab.jsx
│   │   └── utils/
│   │       └── exportClient.js      # PDF/Excel export logic
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── database/
│   └── schema.sql                  # Full PostgreSQL DDL (enums, tables, indexes, triggers)
├── docker-compose.yml              # 3-service composition (db, app, nginx)
├── Dockerfile                      # Python 3.11-slim + backend + pre-built frontend
├── nginx.conf                      # Reverse proxy → app:8000
├── start.sh                        # Container entry: seed DB → start uvicorn
├── .env                            # Runtime secrets (NOT in git)
└── .gitignore
```

---

## 4. Database Architecture

### 4.1 ER Diagram (Conceptual)

```
┌──────────┐
│  users   │  (CA firm staff login accounts)
└──────────┘

┌──────────────────────────────────────────────────┐
│                    clients                        │  (Master: every entity — Individual,
│  PAN, constitution, name, KYC, credentials...    │   Company, LLP, Partnership, etc.)
└──────────────────────┬───────────────────────────┘
                       │ 1
          ┌────────────┼────────────┬──────────────┬───────────────┐
          │            │            │              │               │
    ┌─────▼─────┐ ┌───▼────┐ ┌────▼────┐  ┌──────▼──────┐ ┌─────▼──────┐
    │    gst    │ │  bank  │ │ epf_esi │  │   other     │ │ directors  │
    │registr.  │ │accounts│ │registr. │  │   registr.  │ │shareholders│
    └─────┬─────┘ └────────┘ └─────────┘  └─────────────┘ │ partners   │
          │                                                └────────────┘
    ┌─────▼──────┐                                    (link tables: Company ↔ Individual)
    │    gst     │
    │signatories │
    └────────────┘
```

### 4.2 Table Details

#### `users` — Staff Login Accounts
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| name | TEXT | |
| email | TEXT | Unique |
| password_hash | TEXT | bcrypt hash |
| role | ENUM: `admin`, `staff` | Default: `staff` |
| is_active | BOOLEAN | Default: `true` |
| created_at / updated_at | TIMESTAMPTZ | Auto-managed |

#### `clients` — Master Entity Table (60+ columns)
| Section | Key Columns |
|---------|-------------|
| **Identity** | `pan` (unique), `constitution` (enum), `display_name`, `legal_name`, `date_of_incorporation_birth`, `cin_llpin`, `tan` |
| **Flags** | `is_direct_client`, `is_active`, `is_on_retainer`, `client_since` |
| **Individual KYC** | `father_name`, `mother_name`, `gender`, `nationality`, `aadhaar_no`, `din`, `passport_no`, `passport_expiry` |
| **MCA v3** | `mca_user_id`, `mca_password` (encrypted) |
| **DSC** | `dsc_provider`, `dsc_expiry_date`, `dsc_token_password` (encrypted) |
| **Contact** | `primary_phone`, `secondary_phone`, `primary_email`, `secondary_email` |
| **Address** | `address_line1`, `address_line2`, `city`, `state`, `pin_code` |
| **IT Portal** | `it_portal_user_id`, `it_portal_password` (enc), `it_portal_user_id_tds`, `it_password_tds` (enc), `password_26as` (enc), `password_ais_tis` (enc) |
| **TRACES** | `traces_user_id_deductor`, `traces_password_deductor` (enc), `traces_user_id_taxpayer`, `traces_password_taxpayer` (enc) |

#### `gst_registrations` — One row per GSTIN
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| client_id | UUID (FK → clients) | CASCADE delete |
| gstin | TEXT | Unique |
| state / state_code | TEXT / CHAR(2) | |
| registration_type | ENUM: Regular, Composition, QRMP, SEZ Unit, SEZ Developer, Casual, Non-Resident | |
| gst_user_id / gst_password | TEXT | Password encrypted |
| ewb_user_id / ewb_password | TEXT | E-Way Bill credentials (encrypted) |
| ewb_api_user_id / ewb_api_password | TEXT | E-Way Bill API credentials (encrypted) |

#### `gst_signatories` — Authorised Signatories per GSTIN
| Column | Type | Notes |
|--------|------|-------|
| gst_registration_id | UUID (FK → gst_registrations) | CASCADE delete |
| signatory_client_id | UUID (FK → clients) | Links to Individual client |
| Unique constraint | (gst_registration_id, signatory_client_id) | |

#### `directors` — Company ↔ Individual Link
| Column | Type | Notes |
|--------|------|-------|
| company_client_id | UUID (FK, composite PK) | Company client |
| individual_client_id | UUID (FK, composite PK) | Individual client |
| designation | ENUM: Director, Managing Director, Whole-time, Independent, Nominee, Additional | |
| is_kmp | BOOLEAN | Key Managerial Person |

#### `shareholders` — Company Shareholding
| Column | Type | Notes |
|--------|------|-------|
| company_client_id | UUID (FK) | |
| holder_type | ENUM: Individual, Company, Trust, HUF, LLP | |
| individual_client_id / holding_entity_client_id | UUID (FK) | One is filled based on holder_type |
| share_type | ENUM: Equity, Preference, CCPS, OCPS | |
| number_of_shares / face_value / percentage | INT / NUMERIC | |

#### `partners` — Firm/LLP ↔ Individual Link
| Column | Type | Notes |
|--------|------|-------|
| firm_llp_client_id | UUID (FK) | Partnership/LLP client |
| individual_client_id | UUID (FK) | Individual client |
| role | ENUM: Partner, Designated Partner, Managing Partner, Sleeping Partner, Minor Partner | |
| profit_sharing_ratio | NUMERIC(5,2) | |
| capital_contribution | NUMERIC(15,2) | |

#### `bank_accounts`
| Column | Type | Notes |
|--------|------|-------|
| client_id | UUID (FK) | |
| bank_name / account_number / ifsc_code | TEXT | Required |
| account_type | ENUM: Current, Savings, Cash Credit, Overdraft, EEFC | |
| net_banking_user_id / net_banking_password | TEXT | Password encrypted |

#### `epf_esi_registrations`
| Column | Type | Notes |
|--------|------|-------|
| client_id | UUID (FK) | |
| registration_type | ENUM: EPF, ESI | |
| establishment_code | TEXT | Required |
| portal_user_id / portal_password | TEXT | Password encrypted |

#### `other_registrations`
| Column | Type | Notes |
|--------|------|-------|
| client_id | UUID (FK) | |
| registration_type | ENUM: MSME/Udyam, IEC, FSSAI, Professional Tax, Shops & Estab, Trade License, Drug License, Import Export Code, Others | |
| registration_number | TEXT | Required |
| valid_until | DATE | Expiry tracking |
| portal_user_id / portal_password | TEXT | Password encrypted |

### 4.3 PostgreSQL Enums (11 types)

`constitution_type`, `gender_type`, `gst_registration_type`, `designation_type`, `holder_type`, `share_type`, `partner_role`, `bank_account_type`, `epf_esi_type`, `other_reg_type`, `user_role`

### 4.4 Auto-Updated Timestamps

A PostgreSQL trigger (`trigger_set_updated_at`) automatically sets `updated_at = NOW()` on every `UPDATE` for all 10 tables.

### 4.5 Indexes

- `clients`: pan, constitution, display_name, is_active, din (partial), tan (partial)
- `gst_registrations`: client_id, gstin
- `gst_signatories`: registration_id, client_id
- `directors`: company_client_id, individual_client_id
- `shareholders`: company_client_id, individual_client_id (partial), entity_client_id (partial)
- `partners`: firm_client_id, individual_client_id
- `bank_accounts`: client_id
- `epf_esi_registrations`: client_id
- `other_registrations`: client_id, valid_until (partial)

---

## 5. Backend Architecture

### 5.1 Application Entry Point (`main.py`)

```
FastAPI app
├── CORS middleware (allow all origins)
├── 9 API routers, all under /api prefix
├── /health endpoint
└── Static file serving (React SPA)
    ├── /assets/* → StaticFiles(frontend/dist/assets)
    └── /{any_path} → frontend/dist/index.html (SPA fallback)
```

### 5.2 Authentication Flow (`auth.py`)

1. **Login**: `POST /api/auth/login` → verify email + bcrypt password → return JWT
2. **JWT Token**: HS256 algorithm, contains `sub` (user_id), `role`, `exp` (configurable hours)
3. **Protected Routes**: `Depends(get_current_user)` → decode JWT, fetch user from DB
4. **Admin-Only**: `Depends(require_admin)` → checks `role == "admin"`
5. **Default admin**: `admin@ca.com` / `admin@123` (seeded on first startup)

### 5.3 Encryption Layer (`crypto.py`)

- **Algorithm**: Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256)
- **Key**: Stored in `CREDENTIAL_ENCRYPTION_KEY` env var
- **Usage**: All portal password fields are encrypted before DB write, decrypted on read
- **Lazy initialization**: Fernet object created on first use, cached globally

**Encrypted fields across all tables:**
- Client: `mca_password`, `dsc_token_password`, `it_portal_password`, `it_password_tds`, `password_26as`, `password_ais_tis`, `traces_password_deductor`, `traces_password_taxpayer`
- GST: `gst_password`, `ewb_password`, `ewb_api_password`
- Bank: `net_banking_password`
- EPF/ESI: `portal_password`
- Other Reg: `portal_password`

### 5.4 Database Connection (`database.py`)

- `DATABASE_URL` from environment (default: `postgresql://postgres:password@localhost:5432/ca_clients`)
- Handles Railway's `postgres://` → `postgresql://` prefix conversion
- Connection pool with `pool_pre_ping=True` for stale connection detection
- Session factory via `SessionLocal`

### 5.5 Startup Seed (`seed.py` via `start.sh`)

Runs on every container start:
1. Reads `database/schema.sql` and executes DDL statements (safe — ignores "already exists")
2. Creates default admin user if not present

### 5.6 Router Pattern

Each router follows the same pattern:
```python
router = APIRouter(prefix="/<entity>", tags=["<Entity>"])

# CRUD endpoints — all require JWT auth
GET    ""           → list (with optional query filters)
POST   ""           → create (encrypt passwords, validate uniqueness)
GET    "/{id}"      → get single (decrypt passwords)
PUT    "/{id}"      → update (encrypt changed passwords)
DELETE "/{id}"      → delete or soft-deactivate
```

**Special behaviors:**
- `DELETE /clients/{id}` → soft delete (sets `is_active = false`), does NOT delete the record
- `DELETE /gst/{id}` → hard delete (cascades to signatories)
- Directors use composite PK: `PUT /directors/{company_id}/{individual_id}`
- GST has sub-resource: `POST /gst/{id}/signatories`, `DELETE /gst/{id}/signatories/{sig_id}`

---

## 6. Frontend Architecture

### 6.1 Routing (`App.jsx`)

```
/login              → Login page (public)
/                   → Dashboard — client list (protected)
/clients/new        → New client form (protected)
/clients/:id        → Client detail with tabs (protected)
*                   → Redirect to /
```

All protected routes are wrapped in `<ProtectedRoute>` and `<Layout>`.

### 6.2 Auth Context (`AuthContext.jsx`)

- Stores JWT token in `localStorage`
- On mount: reads token, calls `GET /api/auth/me` to validate
- Provides: `user`, `loading`, `login()`, `logout()`
- Auto-redirect to `/login` on 401 response (Axios interceptor)

### 6.3 API Layer (`api.js`)

Single Axios instance with `baseURL: '/api'`:
- **Request interceptor**: Attaches `Authorization: Bearer <token>` header
- **Response interceptor**: On 401 → clear token, redirect to `/login`
- Exports: `authApi`, `clientsApi`, `gstApi`, `directorsApi`, `shareholdersApi`, `partnersApi`, `bankApi`, `epfEsiApi`, `otherRegApi`

### 6.4 Pages

#### Dashboard (`Dashboard.jsx`)
- Client list with search bar (searches name + PAN)
- Filter dropdowns: constitution type, active/inactive, direct/indirect client
- Click row → navigate to `/clients/:id`
- "New Client" button → `/clients/new`

#### ClientNew (`ClientNew.jsx`)
- Uses `ClientForm` component
- Dynamic fields based on constitution type selection

#### ClientDetail (`ClientDetail.jsx`)
- **Tabbed interface** with sections:
  - **Overview** — Basic info, contact, address + editable form
  - **KYC** — Individual identity documents, MCA, DSC
  - **Credentials** — IT Portal, TRACES (all password fields with show/hide toggle)
  - **GST** — GST registrations + signatory management
  - **Directors** — For Companies (with create-individual-on-the-fly)
  - **Shareholders** — For Companies
  - **Partners** — For Partnerships/LLPs
  - **Bank Accounts**
  - **EPF/ESI**
  - **Other Registrations**
- **Export menu** — PDF or Excel for individual sections or full profile
- Tabs shown conditionally based on constitution type (e.g., Directors tab only for Companies)

### 6.5 Key Components

#### `ClientForm.jsx`
- Dynamic form fields based on constitution type
- Auto-populates IT Portal credentials from PAN, TAN, DOB:
  - IT Portal User ID = PAN
  - IT Portal TDS User ID = TAN
  - Various default passwords derived from PAN + DOB

#### `NewIndividualModal.jsx`
- Quick creation of Individual clients from within Directors/Shareholders/Partners tabs
- Built-in PAN duplicate checking before submission

#### `ExportMenu.jsx` + `utils/exportClient.js`
- **PDF**: Uses jsPDF + jspdf-autotable for formatted table output
- **Excel**: Uses SheetJS (xlsx) for spreadsheet generation
- Supports single-section or full-profile export

### 6.6 Tab Components

Each tab component (`tabs/*.jsx`) follows this pattern:
1. Fetch data on mount via API
2. Display in a table/card layout
3. Add/Edit via modal forms
4. Delete with confirmation
5. Decrypt and show/hide passwords inline

---

## 7. Infrastructure & Deployment

### 7.1 Docker Compose Architecture

```
┌─────────────────────────────────────────────────┐
│               Docker Compose                     │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  nginx   │───▶│   app    │───▶│    db    │  │
│  │ :80→:80  │    │ :8000    │    │ :5432    │  │
│  │ (Alpine) │    │(Python)  │    │(Postgres │  │
│  └──────────┘    └──────────┘    │  15)     │  │
│                                   └──────────┘  │
│                                   [volume:      │
│                                    postgres_data]│
└─────────────────────────────────────────────────┘
```

**Service dependencies:**
- `app` depends on `db` (condition: `service_healthy` — uses `pg_isready`)
- `nginx` depends on `app` (started)

### 7.2 Dockerfile (`app` service)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY start.sh start.sh
COPY frontend/dist backend/dist    # Pre-built frontend
CMD ["bash", "start.sh"]
```

### 7.3 Container Startup (`start.sh`)

```bash
set -e
# Skip frontend build if dist already exists (built during CI)
if [ ! -d "backend/dist" ]; then
  cd frontend && npm ci && npm run build && cp -r dist ../backend/dist && cd ..
fi
cd backend
python seed.py       # Init schema + seed admin
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### 7.4 Nginx Configuration

```nginx
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://app:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

All traffic (API + frontend static files) is proxied through nginx to the FastAPI app. The FastAPI app serves both the API (`/api/*`) and the React SPA (`/*`).

### 7.5 CI/CD Pipeline (`.github/workflows/deploy.yml`)

**Trigger**: Push to `main` branch

**Steps:**
1. **Checkout code** (actions/checkout@v4)
2. **Setup Node.js 20** with npm cache
3. **Build frontend** on GitHub Actions runner (`npm ci && npm run build`)
4. **SCP** `frontend/dist` to VM at `~/client-dashboard/frontend/dist`
5. **SSH into VM** and:
   - `git pull origin main`
   - Write `.env` file from GitHub Secrets
   - `docker compose up -d --build`

**GitHub Secrets required:**
| Secret | Purpose |
|--------|---------|
| `GCE_HOST` | VM IP address |
| `GCE_USER` | SSH username |
| `GCE_SSH_KEY` | SSH private key |
| `DB_PASSWORD` | PostgreSQL password |
| `SECRET_KEY` | JWT signing key |
| `CREDENTIAL_ENCRYPTION_KEY` | Fernet key for portal passwords |

### 7.6 Deployment Flow Diagram

```
Developer pushes to main
         │
         ▼
GitHub Actions Runner
  ├── npm ci + npm run build (frontend)
  ├── SCP dist/ → GCE VM
  └── SSH into GCE VM
         │
         ▼
GCE VM (~/ client-dashboard/)
  ├── git pull origin main
  ├── Write .env from secrets
  └── docker compose up -d --build
         │
         ▼
Docker rebuilds app image
  ├── Install Python deps
  ├── Copy backend + frontend/dist
  └── Start: seed.py → uvicorn :8000
         │
         ▼
Nginx proxies :80 → app:8000
         │
         ▼
Site live at http://clients.youwequest.com
```

---

## 8. Security & Encryption

### 8.1 Authentication
- **JWT tokens** (HS256) with configurable expiry (`ACCESS_TOKEN_EXPIRE_HOURS`, default 8)
- **bcrypt** password hashing (pinned `bcrypt==4.0.1` for passlib compatibility)
- Role-based access: `admin` and `staff` roles
- Admin-only endpoints: user CRUD

### 8.2 Credential Encryption
- **Fernet symmetric encryption** (AES-128-CBC + HMAC-SHA256)
- Key generated once: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- All portal passwords encrypted before DB write, decrypted on API read
- Invalid/corrupt tokens return `None` (graceful failure)

### 8.3 CORS
- Currently allows all origins (`allow_origins=["*"]`) — suitable for single-domain deploy behind nginx

### 8.4 Client-Side Token Storage
- JWT stored in `localStorage`
- Auto-cleared on 401 response
- Attached to every API request via Axios interceptor

---

## 9. API Reference

All endpoints are prefixed with `/api` and require JWT auth unless noted.

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login, returns JWT + user info |
| GET | `/auth/me` | User | Get current authenticated user |
| POST | `/auth/users` | Admin | Create new staff user |
| GET | `/auth/users` | Admin | List all users |
| PUT | `/auth/users/{id}` | Admin | Update user (name, email, password, role, active) |

### Clients (`/api/clients`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/clients` | List clients (query: `search`, `constitution`, `is_active`, `is_direct`) |
| POST | `/clients` | Create client (encrypts passwords, validates PAN uniqueness) |
| GET | `/clients/{id}` | Get client with decrypted credentials |
| PUT | `/clients/{id}` | Update client fields |
| DELETE | `/clients/{id}` | **Soft delete** — sets `is_active = false` |

### GST (`/api/gst`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/gst` | List GST registrations (query: `client_id`) |
| POST | `/gst` | Create registration (validates GSTIN uniqueness) |
| GET | `/gst/{id}` | Get with signatories + decrypted passwords |
| PUT | `/gst/{id}` | Update registration |
| DELETE | `/gst/{id}` | **Hard delete** (cascades to signatories) |
| POST | `/gst/{id}/signatories` | Add signatory (body: `signatory_client_id`) |
| DELETE | `/gst/{id}/signatories/{sig_id}` | Remove signatory |

### Directors (`/api/directors`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/directors` | List (query: `company_client_id`) |
| POST | `/directors` | Create link (validates both clients exist) |
| PUT | `/directors/{company_id}/{individual_id}` | Update designation/dates |
| DELETE | `/directors/{company_id}/{individual_id}` | Remove link |

### Shareholders (`/api/shareholders`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/shareholders` | List (query: `company_client_id`) |
| POST | `/shareholders` | Create shareholding record |
| PUT | `/shareholders/{id}` | Update |
| DELETE | `/shareholders/{id}` | Remove |

### Partners (`/api/partners`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/partners` | List (query: `firm_llp_client_id`) |
| POST | `/partners` | Create partnership link |
| PUT | `/partners/{id}` | Update role/contribution |
| DELETE | `/partners/{id}` | Remove |

### Bank Accounts (`/api/bank-accounts`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/bank-accounts` | List (query: `client_id`) |
| POST | `/bank-accounts` | Create (encrypts net banking password) |
| PUT | `/bank-accounts/{id}` | Update |
| DELETE | `/bank-accounts/{id}` | Remove |

### EPF/ESI (`/api/epf-esi`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/epf-esi` | List (query: `client_id`) |
| POST | `/epf-esi` | Create (encrypts portal password) |
| PUT | `/epf-esi/{id}` | Update |
| DELETE | `/epf-esi/{id}` | Remove |

### Other Registrations (`/api/other-registrations`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/other-registrations` | List (query: `client_id`) |
| POST | `/other-registrations` | Create (encrypts portal password) |
| PUT | `/other-registrations/{id}` | Update |
| DELETE | `/other-registrations/{id}` | Remove |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Returns `{"status": "ok"}` |

---

## 10. Environment Variables

### `.env` file (on GCE VM, written by CI/CD from GitHub Secrets)

```env
DB_PASSWORD=<postgresql-password>
SECRET_KEY=<jwt-signing-secret>
CREDENTIAL_ENCRYPTION_KEY=<fernet-key-base64>
ACCESS_TOKEN_EXPIRE_HOURS=8
```

### Docker Compose Environment Mapping

| Container | Env Var | Source |
|-----------|---------|--------|
| `db` | `POSTGRES_DB` | Hardcoded: `ca_clients` |
| `db` | `POSTGRES_USER` | Hardcoded: `postgres` |
| `db` | `POSTGRES_PASSWORD` | `${DB_PASSWORD}` from .env |
| `app` | `DATABASE_URL` | `postgresql://postgres:${DB_PASSWORD}@db:5432/ca_clients` |
| `app` | `SECRET_KEY` | `${SECRET_KEY}` from .env |
| `app` | `CREDENTIAL_ENCRYPTION_KEY` | `${CREDENTIAL_ENCRYPTION_KEY}` from .env |
| `app` | `ACCESS_TOKEN_EXPIRE_HOURS` | `${ACCESS_TOKEN_EXPIRE_HOURS:-8}` |

### Generating a Fernet Key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 11. Implementation History

### Phase 1: Schema Design (2026-02-24)
- Initial Excel schema file and generator script
- Iterated through multiple schema revisions: separate Persons sheet → unified Client Master
- GST signatory linked by Client ID (not separate name/PAN)

### Phase 2: Full-Stack Build (2026-02-28)
- PostgreSQL schema (`schema.sql`) with 10 tables, 11 enum types, indexes, triggers
- FastAPI backend with all CRUD endpoints, JWT auth, Fernet encryption
- React frontend (Vite + Tailwind) with login, dashboard, client detail pages
- Admin seed script, setup guide
- Serve frontend via FastAPI (SPA mode)

### Phase 3: Railway Deployment Attempts (2026-02-28)
- Railway config + DB seed
- Fixed `postgres://` → `postgresql://` for SQLAlchemy 2.x
- Multiple nixpacks fixes (pip → pip3, auto-detection)
- Switched from nixpacks to Dockerfile for reliable builds
- Pinned `bcrypt==4.0.1` to fix passlib crash

### Phase 4: Self-Hosted Deployment (2026-02-28 – 2026-03-04)
- Docker Compose setup (originally for Oracle Cloud free tier)
- Auto-populate IT Portal credentials from PAN/TAN/DOB
- Vite proxy fix for `/api` prefix
- Data migration script from Railway to local PostgreSQL
- Added nginx reverse proxy to fix 502 Bad Gateway
- Gitignored `backend/dist` build artifact

### Phase 5: Feature Enhancement (2026-03-05)
- Copy-to-clipboard buttons for credentials
- PDF and Excel export (single section + full profile)
- Create-individual-on-the-fly from Directors/Shareholders/Partners tabs
- Premium glassmorphism UI styling

### Phase 6: GCE Deployment with GitHub Actions (2026-03-05 – 2026-03-06)
- GitHub Actions workflow for auto-deploy to Google Cloud VM
- SSH key setup for GCE metadata persistence
- Multiple timeout fixes (30m → 60m → 10m with pre-built frontend)
- Dockerfile layer reordering for dependency caching
- Frontend built on GitHub Actions runner, SCP'd to VM (faster than building on VM)
- Fixed `.env` sourcing in non-interactive SSH sessions
- Fixed heredoc YAML syntax error → echo statements
- **Fixed GitHub Secrets not being exposed as env vars** to SSH session (root cause of 502)

### Commit Timeline (Chronological)

| Date | Commits | Summary |
|------|---------|---------|
| 2025-05-18 | Multiple | Initial HTML/JS prototype uploads and cleanups |
| 2026-02-24 | 2 | Excel schema generator, PR #1 |
| 2026-02-28 | ~15 | Full-stack build + Railway + Docker Compose + features |
| 2026-03-04 | 5 | Migration script, proxy fix, nginx, gitignore |
| 2026-03-05 | 8 | Export features, GCE deployment setup, SSH key, timeouts |
| 2026-03-06 | 6 | Deploy workflow fixes (env vars, YAML, secrets) |

---

## 12. Common Operations

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
cp ../.env .env  # ensure env vars are set
python seed.py
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev      # Vite dev server with proxy to :8000
```

### Docker (Local)

```bash
# Create .env with DB_PASSWORD, SECRET_KEY, CREDENTIAL_ENCRYPTION_KEY
docker compose up -d --build
# App at http://localhost:80
```

### Manual Deploy to GCE VM

```bash
ssh user@<GCE_HOST>
cd ~/client-dashboard
git pull origin main
# Edit .env if needed
docker compose up -d --build
docker compose logs -f app   # Check for errors
```

### Checking Container Health

```bash
docker compose ps              # All services status
docker compose logs app        # Backend logs
docker compose logs db         # Database logs
docker compose exec db psql -U postgres -d ca_clients  # DB shell
```

### Resetting Admin Password

```bash
docker compose exec app python -c "
from database import SessionLocal
from models import User
from auth import hash_password
db = SessionLocal()
user = db.query(User).filter(User.email == 'admin@ca.com').first()
user.password_hash = hash_password('new-password')
db.commit()
print('Done')
"
```

### Generating New Encryption Key

> **WARNING**: Changing the encryption key will make ALL existing encrypted passwords unreadable.

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Update CREDENTIAL_ENCRYPTION_KEY in GitHub Secrets and .env on VM
```

---

*Document generated from codebase analysis on 2026-03-06.*
