# SomaSense - Project Overview

An AI-powered fitness ecosystem with a React/TypeScript frontend and a FastAPI (Python) backend. SomaSense synchronizes your nutrition, physical programs, and supplies through the power of Google Gemini.

## System Framework

The project is divided into two main segments:
- **Backend**: Located in the `backend/` directory, built with **FastAPI** and **SQLAlchemy**. It uses **SQLite** as the primary vault (`fitness_app.db`).
- **Frontend**: Located in the `frontend/` directory, built with **React**, **TypeScript**, and **Vite**. Styling is handled by **Tailwind CSS v4**.

### Core Features
- **Inventory Management**: Track resources, their magnitudes, sectors (Ice, Pantry, Freezer), and expiration timestamps.
- **AI Nutrition Crafting**: Generates personalized meal protocols based on current inventory using Google Gemini.
- **AI Program Design**: Generates a physical routine based on user data and biological parameters.
- **AI Supply Sync**: Generates shopping lists by comparing inventory with the active program.

---

## Configuration

### AI Integration (Gemini)
To use AI features, you must provide a Google Gen AI API Key:
1. Create a `.env` file in the root directory (use `.env.template` as a guide).
2. Add your key: `GOOGLE_API_KEY=your_actual_key_here`.

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
- **Intelligence**: Google Gen AI (google-genai)

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS v4 (Glassmorphism + Ancient Earth theme)
- **Icons**: `lucide-react`
- **Typing**: Strict TypeScript
