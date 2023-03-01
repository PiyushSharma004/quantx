#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# QuantX — One-command setup script
# Run: bash setup.sh
# ──────────────────────────────────────────────────────────────────

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "  ██████╗ ██╗   ██╗ █████╗ ███╗   ██╗████████╗██╗  ██╗"
echo "  ██╔═══██╗██║   ██║██╔══██╗████╗  ██║╚══██╔══╝╚██╗██╔╝"
echo "  ██║   ██║██║   ██║███████║██╔██╗ ██║   ██║    ╚███╔╝ "
echo "  ██║▄▄ ██║██║   ██║██╔══██║██║╚██╗██║   ██║    ██╔██╗ "
echo "  ╚██████╔╝╚██████╔╝██║  ██║██║ ╚████║   ██║   ██╔╝ ██╗"
echo "   ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝"
echo -e "${NC}"
echo "  India AI Trading Platform — Setup"
echo "────────────────────────────────────────────────────────"

# Check node
if ! command -v node &>/dev/null; then
  echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org (v18+)${NC}"
  exit 1
fi
NODE_VER=$(node -v | cut -c2- | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}❌ Node.js v18+ required. You have $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}📋 .env created from .env.example — edit it to add your API keys${NC}"
fi

# Install root deps
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install client deps
echo ""
echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

# Install server deps
echo ""
echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

echo ""
echo -e "${GREEN}✅ All dependencies installed!${NC}"
echo ""
echo "────────────────────────────────────────────────────────"
echo "  🚀 To start the project:"
echo ""
echo "  Terminal 1 — Start backend:"
echo "    cd server && npm run dev"
echo ""
echo "  Terminal 2 — Start frontend:"
echo "    cd client && npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo "────────────────────────────────────────────────────────"
