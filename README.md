# 🎓 AI-Powered Adaptive Learning Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC2626?style=for-the-badge)](https://qdrant.tech/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

An end-to-end, multimodal educational platform that converts unstructured course materials (textbooks, lecture slides, diagrams, and video keyframes) into an interactive, concept-driven learning experience. Features **source-grounded RAG with verifiable citations**, **autonomous knowledge graph extraction**, and **adaptive assessments**.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Start Infrastructure (Docker)](#3-start-infrastructure-docker)
  - [4. Backend Setup](#4-backend-setup)
  - [5. Frontend Setup](#5-frontend-setup)
- [API Overview](#-api-overview)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## ✨ Key Features

- **📑 Multimodal Ingestion Pipeline:** Ingests and parses `.pdf` documents, `.pptx` presentations, raw figures, and video frames using `PyMuPDF` and `python-pptx`.
- **🖼️ Multimodal Diagram Comprehension:** Employs Google Gemini (`gemini-2.5-flash`) to generate rich semantic interpretations of charts, flowcharts, and architectural diagrams.
- **🛡️ 100% Verifiable Source-Grounded RAG:** Eliminates AI hallucinations by grounding responses strictly within retrieved chunks with clickable citation modals linked directly to the original page excerpt.
- **🕸️ Interactive Knowledge Graphs:** Automatically extracts course topics, subtopics, and prerequisite dependencies into an interactive visual roadmap.
- **📝 Adaptive Assessments & Analytics:** Automatically generates context-aware quizzes, scores knowledge gaps, and provides real-time mastery analytics.
- **🔄 Retention & Revision Engine:** Implements spaced-repetition memory decay algorithms to prompt proactive review sessions.

---


## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19, Vite
- **Styling:** Modern Vanilla CSS Design Tokens (Glassmorphism, Dark Mode)
- **Icons & Effects:** Lucide React, Canvas Confetti

### Backend & AI Pipeline
- **API Framework:** FastAPI, Uvicorn, Pydantic
- **ORM & Migrations:** SQLAlchemy, Alembic
- **Databases:** PostgreSQL (Relational metadata), Qdrant (Vector storage)
- **Authentication:** Argon2 password hashing, PyJWT
- **LLM & Embeddings:** Google Gemini (`gemini-2.5-flash`), `sentence-transformers` (`all-MiniLM-L6-v2`)
- **Document Extractors:** `PyMuPDF` (`fitz`), `python-pptx`
- **Orchestration:** Docker, Docker Compose

---

## 📁 Project Structure

```text
AI-Learning_Platform/
├── backend/
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── api/                # API routes & endpoints (v1)
│   │   ├── core/               # Configuration, security & auth
│   │   ├── db/                 # DB session & base models
│   │   ├── models/             # SQLAlchemy ORM definitions
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   └── services/           # RAG, LLM, extraction & ingestion services
│   ├── docs/                   # Architecture & API specifications
│   ├── compose.yaml            # Docker Compose services (Postgres, Qdrant)
│   ├── Dockerfile              # Backend containerization
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components (Sidebar, Modals, Header)
│   │   ├── context/            # React context providers (Auth, App state)
│   │   ├── services/           # Frontend API client
│   │   ├── views/              # Page views (Tutor, Graph, Assessments, etc.)
│   │   ├── App.jsx             # Main application orchestrator
│   │   └── index.css           # Global design system & theme variables
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Git](https://git-scm.com/)
- [Python 3.11+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/) & npm
- [Docker & Docker Compose](https://www.docker.com/)

---

### 1. Clone Repository

```bash
git clone https://github.com/raajaharivignesh-s/AI-Learning_Platform.git
cd AI-Learning_Platform
```

---

### 2. Environment Configuration

Create a `.env` file inside the `backend/` directory:

```env
APP_NAME=Adaptive Learning Platform
APP_ENV=development
APP_VERSION=0.1.0
DEBUG=true
API_V1_PREFIX=/api/v1

LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173

DATABASE_URL=postgresql+psycopg://app_user:change_me@localhost:5433/adaptive_learning
TEST_DATABASE_URL=sqlite:///./test.db

JWT_SECRET_KEY=replace_with_a_secure_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=your_openai_base_url_here
OPENAI_MODEL=gpt-4.1-nano

STORAGE_ROOT=./storage
MAX_UPLOAD_SIZE_MB=100

QDRANT_HOST=localhost
QDRANT_PORT=6334

```

---

### 3. Start Infrastructure (Docker)

Spin up PostgreSQL and Qdrant using Docker Compose:

```bash
cd backend
docker compose up -d db qdrant
```

* PostgreSQL will be exposed on port `localhost:5433`
* Qdrant will be accessible on `http://localhost:6333`

---

### 4. Backend Setup

From the `backend/` folder:

```bash
# 1. Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Apply database migrations
alembic upgrade head

# 4. Start the development server
uvicorn app.main:app --reload --port 8001
```

Backend Swagger documentation will be available at: **`http://localhost:8001/docs`**

---

### 5. Frontend Setup

In a new terminal window, navigate to the `frontend/` folder:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser and navigate to: **`http://localhost:5173`**

---

## 🔌 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new learner account |
| `POST` | `/api/v1/auth/login` | Authenticate user and obtain JWT token |
| `GET` / `POST` | `/api/v1/courses` | List or create student courses |
| `POST` | `/api/v1/courses/{id}/resources` | Upload PDF, PPTX, or image materials |
| `POST` | `/api/v1/courses/{id}/knowledge-map`| Automatically infer topics & prerequisite graph |
| `POST` | `/api/v1/chat` | Source-grounded RAG tutor query with citations |
| `GET` / `POST` | `/api/v1/courses/{id}/assessments`| Retrieve adaptive quizzes & submit answers |

---

## 🗺️ Roadmap

- [x] Multimodal document parsing (PDF, PPTX, Images)
- [x] Verified source-grounded RAG with citation scrubbing
- [x] Concept prerequisite knowledge graph extraction
- [x] Spaced-repetition revision tracking
- [ ] Real-time conversational voice tutor with speech-to-speech
- [ ] Canvas & Moodle LMS synchronization plugins
- [ ] Collaborative study rooms and peer-to-peer quizzes

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
```
