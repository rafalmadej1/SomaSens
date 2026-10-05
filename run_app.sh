#!/bin/bash

# Portability and Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

cd "$(dirname "$0")"

printf "${BLUE}>>> SomaSense: System Check...${NC}\n"
printf "${BLUE}>>> Database: backend/fitness_app.db${NC}\n"

# 1. Python Environment Check
PYTHON_BIN="./.venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
    printf "${RED}ERROR: Python not found in ./.venv/bin/.${NC}\n"
    printf "Ensure the virtual environment is in the '.venv' folder.\n"
    exit 1
fi

# 2. Port Check (8000 and 5173)
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0 # Occupied
    else
        return 1 # Free
    fi
}

if check_port 8000; then
    printf "${RED}ERROR: Port 8000 (Backend) is already occupied.${NC}\n"
    printf "Use 'lsof -i :8000' to find and terminate the process.\n"
    exit 1
fi

# 3. .env Check
if [ ! -f .env ]; then
    printf "${YELLOW}WARNING: .env file missing. Configure local Ollama settings before using AI features.${NC}\n"
fi

# 4. Frontend Dependencies
if [ ! -d "frontend/node_modules" ]; then
    printf "${BLUE}>>> Installing frontend dependencies...${NC}\n"
    npm --prefix frontend install || { printf "${RED}npm install failed.${NC}\n"; exit 1; }
fi

# Cleanup Function
cleanup() {
    trap - SIGINT SIGTERM EXIT
    printf "\n${BLUE}>>> Terminating all processes...${NC}\n"
    [ -n "$BACKEND_PID" ] && kill -TERM "$BACKEND_PID" 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill -TERM "$FRONTEND_PID" 2>/dev/null
}

trap 'cleanup; exit' SIGINT SIGTERM
trap cleanup EXIT

# 5. Start Backend
printf "${GREEN}>>> Initializing Backend (8000)...${NC}\n"
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
$PYTHON_BIN -m uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# 6. Start Frontend
printf "${GREEN}>>> Initializing Frontend...${NC}\n"
npm --prefix frontend run dev &
FRONTEND_PID=$!

printf "${BLUE}>>> Ecosystem Ready. Ctrl+C to shutdown.${NC}\n"

# Monitor processes
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        printf "${RED}ERROR: Backend process terminated unexpectedly.${NC}\n"
        break
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        printf "${RED}ERROR: Frontend process terminated unexpectedly.${NC}\n"
        break
    fi
    sleep 2
done

cleanup
