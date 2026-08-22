# HRMS — Human Resource Management System

**Every workday, perfectly aligned.**

A full-stack, production-ready HR Management System built for hackathon submission and real deployment.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

---

## Features

| Module | Capabilities |
|--------|--------------|
| **Authentication** | Register, Login, JWT, role-based access (Employee / HR) |
| **Employee Dashboard** | Attendance status, quick check-in/out, leave summary, notifications |
| **HR Dashboard** | Live metrics, pending leaves, quick approve/reject |
| **Attendance** | Check-in / Check-out, history, admin filters |
| **Leave Management** | Apply (Paid/Sick/Unpaid), approve/reject with comments, notifications |
| **Employee Management** | List, search, view & edit profiles (HR) |
| **Payroll** | View salary structure; HR can update |
| **Profile** | View job info, edit limited fields |
| **Notifications** | In-app alerts for leave decisions & activity |

---

## Quick Start (Local)

### Prerequisites
- Python 3.10+

### Run in 3 commands

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000**

Demo data is **auto-seeded** on first start.

### Demo Logins

| Role | Email | Password |
|------|-------|----------|
| **HR Admin** | `hr@dayflow.dev` | `HRAdmin2026` |
| Employee | `alice@dayflow.dev` | `Employee2026` |
| Employee | `bob@dayflow.dev` | `Employee2026` |
| Employee | `carol@dayflow.dev` | `Employee2026` |

API docs: http://localhost:8000/docs

---

## Deploy

### Option A — Render (recommended)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect the repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Optional env: `JWT_SECRET_KEY` = any long random string
6. Deploy → live URL like `https://hrms-xxxx.onrender.com`

### Option B — Railway

1. New project → Deploy from GitHub
2. Root directory: `backend`
3. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Option C — Any server

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Project Structure

```
HRMS/
├── backend/                 # FastAPI API + serves frontend
│   ├── main.py              # Entry, CORS, SPA, auto-seed
│   ├── database.py
│   ├── models.py
│   ├── auth.py
│   ├── seed.py
│   ├── requirements.txt
│   └── routers/
├── frontend/
│   ├── dist/                # Production React build
│   └── src/                 # Source (optional rebuild)
├── Procfile
├── render.yaml
└── README.md
```

---

## Architecture

- **Backend:** FastAPI + SQLModel + SQLite + JWT
- **Frontend:** React 18 + Vite + Tailwind (pre-built)
- **Auth:** Role-based (employee / hr)
- **Single process:** API at `/api/*`, UI at `/`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET_KEY` | hackathon default | Change in production |
| `CORS_ORIGINS` | `*` | Comma-separated origins or `*` |

---

## License

MIT
