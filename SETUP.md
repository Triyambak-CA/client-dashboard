# CA Client Dashboard — Setup Guide

This guide will get the application running on your computer **step by step**.
You do **not** need any prior technical knowledge. Just follow each step in order.

---

## What You Need to Install (One-Time)

| Software | Why | Free? |
|---|---|---|
| PostgreSQL 16 | The database that stores all client data | Yes |
| Python 3.11+ | Runs the backend server | Yes |
| Node.js 20+ | Runs the frontend (the web page you see) | Yes |

---

## PART 1 — Install the Software

### Step 1 · Install PostgreSQL

1. Go to **https://www.postgresql.org/download/windows/**
2. Click **Download the installer**
3. Run the installer. When asked:
   - **Port**: keep `5432` (default)
   - **Password**: choose something you'll remember, e.g. `MyDB@2024` — **write it down**
   - **Locale**: keep default
4. Finish the installation. When asked to launch Stack Builder, you can click **Skip**.

### Step 2 · Install Python

1. Go to **https://www.python.org/downloads/**
2. Download the latest Python 3.11 or 3.12 installer
3. Run the installer. **Important**: on the first screen, tick ✅ **"Add Python to PATH"** before clicking Install Now.
4. Finish the installation.

### Step 3 · Install Node.js

1. Go to **https://nodejs.org/**
2. Click the **LTS** (Long Term Support) version button to download
3. Run the installer with all default options.

---

## PART 2 — Set Up the Database

### Step 4 · Create the Database

1. Open the **pgAdmin 4** application (it was installed with PostgreSQL — find it in your Start Menu).
2. In the left panel, click **Servers → PostgreSQL 16**.
3. It will ask for the password you set in Step 1. Enter it and click OK.
4. Right-click on **Databases** → **Create → Database…**
5. In the **Database** field, type: `ca_clients`
6. Click **Save**.

### Step 5 · Run the Schema (Create All Tables)

1. In pgAdmin, click on the `ca_clients` database you just created.
2. Click the **Query Tool** button (the small lightning bolt icon in the toolbar).
3. In the query editor, click **File → Open** and open the file:
   ```
   database/schema.sql
   ```
4. Click the **Run (▶)** button (or press F5).
5. You should see "Query returned successfully" at the bottom. All tables are now created.

---

## PART 3 — Set Up the Backend

### Step 6 · Open a Terminal (Command Prompt)

Press **Windows + R**, type `cmd`, press Enter.

### Step 7 · Go to the Backend Folder

In the terminal, type (replace the path with wherever you saved the project):
```
cd C:\path\to\client-dashboard\backend
```

### Step 8 · Install Python Packages

```
pip install -r requirements.txt
```
Wait for it to finish (it downloads a few libraries).

### Step 9 · Create the Configuration File

Copy the example config file:
```
copy .env.example .env
```

Now open `.env` in Notepad and fill in the three values:

```
DATABASE_URL=postgresql://postgres:MyDB@2024@localhost:5432/ca_clients
SECRET_KEY=<generate below>
CREDENTIAL_ENCRYPTION_KEY=<generate below>
```

**To generate SECRET_KEY and CREDENTIAL_ENCRYPTION_KEY**, run this in the terminal:
```
python -c "import secrets; print(secrets.token_hex(32))"
```
Copy the output and paste it as your `SECRET_KEY`.

Then run this for the encryption key:
```
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Copy that output as your `CREDENTIAL_ENCRYPTION_KEY`.

> ⚠️ **Important**: Save the `.env` file somewhere safe. If you lose `CREDENTIAL_ENCRYPTION_KEY`, you will not be able to read any saved portal passwords.

### Step 10 · Create Your Admin Login

```
python create_admin.py
```
It will ask for your name, email, and a password. This becomes your login for the app.

### Step 11 · Start the Backend Server

```
python -m uvicorn main:app --reload
```
You should see: `Uvicorn running on http://0.0.0.0:8000`
**Leave this terminal window open.**

---

## PART 4 — Set Up the Frontend

### Step 12 · Open a Second Terminal

Open another Command Prompt (Windows + R → cmd).

### Step 13 · Go to the Frontend Folder

```
cd C:\path\to\client-dashboard\frontend
```

### Step 14 · Install Frontend Packages

```
npm install
```
Wait for it to finish.

### Step 15 · Start the Frontend

```
npm run dev
```
You should see: `Local: http://localhost:5173`
**Leave this terminal window open too.**

---

## PART 5 — Open the App

1. Open your browser (Chrome or Edge recommended).
2. Go to: **http://localhost:5173**
3. Log in with the email and password you set in Step 10.

You're in! 🎉

---

## Everyday Use (After First Setup)

Every time you want to use the app:

1. Open Terminal 1 → go to `backend` folder → run:
   ```
   python -m uvicorn main:app --reload
   ```
2. Open Terminal 2 → go to `frontend` folder → run:
   ```
   npm run dev
   ```
3. Open browser → **http://localhost:5173**

To stop, press **Ctrl + C** in each terminal.

---

## Adding More Users (Staff)

Log in as admin, then use the **Users** section in the app to add staff accounts with the `staff` role. Staff can view and edit clients but cannot manage users.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `psycopg2` error on start | Check your `DATABASE_URL` in `.env` — make sure the password is correct |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` again in the `backend` folder |
| Browser shows blank page | Make sure both terminals are running (backend on 8000, frontend on 5173) |
| Login fails | Re-run `python create_admin.py` to check or reset credentials |
| Port 8000 already in use | Another program is using that port; restart your computer and try again |

---

## Backup Your Data

Your data lives in the PostgreSQL database. To back it up:

1. Open pgAdmin → right-click `ca_clients` → **Backup…**
2. Choose a filename and location, click **Backup**.

Do this regularly — weekly at minimum.
