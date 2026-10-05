# SomaSense - Project Overview

An AI-powered fitness ecosystem with a React/TypeScript frontend and a FastAPI (Python) backend. SomaSense synchronizes nutrition, physical programs, and supplies through a locally hosted Gemma 4 model.

## System Framework

The project is divided into two main segments:
- **Backend**: Located in the `backend/` directory, built with **FastAPI** and **SQLAlchemy**. It uses **SQLite** as the primary vault (`fitness_app.db`).
- **Frontend**: Located in the `frontend/` directory, built with **React**, **TypeScript**, and **Vite**. Styling is handled by **Tailwind CSS v4**.

### Core Features
- **Inventory Management**: Track resources, their magnitudes, sectors (Ice, Pantry, Freezer), and expiration timestamps.
- **AI Nutrition Crafting**: Generates personalized meal protocols from current inventory using local Gemma 4 inference.
- **AI Program Design**: Generates a physical routine based on user data and biological parameters.
- **AI Supply Sync**: Generates shopping lists by comparing inventory with the active program.

---

## Configuration

### AI Integration (Local Gemma 4)
To use AI features, install and run Ollama, then download the configured model:
1. Create a `.env` file in the root directory (use `.env.template` as a guide).
2. Run `ollama pull gemma4`.
3. Configure `OLLAMA_BASE_URL` and `OLLAMA_MODEL` if the defaults do not match your Ollama instance.

---

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js & npm

### Execution
Use the provided script to start the ecosystem:
```bash
./run_app.sh
```

### Backend (Standalone)
```bash
./env/bin/uvicorn backend.main:app --reload --port 8000
```
*API docs: `http://127.0.0.1:8000/docs`*

### Frontend (Standalone)
```bash
cd frontend
npm install
npm run dev
```

---

## Technical Specifications

### Backend
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Vault**: SQLite
- **Intelligence**: Local Gemma 4 through Ollama

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS v4 (Glassmorphism + Ancient Earth theme)
- **Icons**: `lucide-react`
- **Typing**: Strict TypeScript
