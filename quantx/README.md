# QuantX — India AI Trading Platform

> Deep Learning stock prediction · Paper Trading · Live Charts · Order Book · Market News · Zerodha Kite API

![QuantX](client/public/favicon.svg)

## Features

| Feature | Description |
|---|---|
| 📈 **Trading Chart** | Candlestick chart with Bollinger Bands, VWAP, EMA, RSI, MACD, volume |
| 📋 **Order Book** | Live bid/ask depth, recent trades, spread tracking |
| 📰 **Market News** | Real-time Indian market news with sentiment analysis |
| 🤖 **AI Prediction** | LSTM/RNN model predicting Nifty, BankNifty, stock prices |
| 📝 **Paper Trading** | Virtual ₹10L account — place BUY/SELL orders, track P&L |
| 💼 **Portfolio** | Holdings, sector allocation, XIRR return, performance chart |
| ☆  **Watchlist** | Track symbols with live prices, alerts, auto-refresh |
| 🔌 **Zerodha Kite** | Plug in your Kite API key for real NSE/BSE/MCX data |

---

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/quantx.git
cd quantx
```

### 2. One-command setup
```bash
bash setup.sh
```

### 3. Add your API keys (optional — works without them in demo mode)
```bash
# Edit .env
TWELVE_DATA_API_KEY=your_key_here   # free at twelvedata.com
KITE_API_KEY=your_key_here          # from Zerodha Kite Connect
KITE_ACCESS_TOKEN=your_token_here
```

### 4. Run the project

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Open **http://localhost:5173** 🚀

---

## Project Structure

```
quantx/
├── client/                        # React + TypeScript frontend (Vite)
│   ├── public/
│   │   ├── dashboard.html         # Standalone HTML dashboard
│   │   └── favicon.svg
│   └── src/
│       ├── App.tsx                # Root — tab routing
│       ├── main.tsx
│       ├── components/
│       │   ├── layout/            # AppShell, Sidebar, TabNav, TopBar, RightRail
│       │   └── ui/                # ToastStack, shared UI
│       ├── context/store.ts       # Zustand global state
│       ├── hooks/index.ts         # Custom hooks
│       ├── pages/
│       │   ├── LiveChartsPage.tsx    # Candlestick chart + order book
│       │   ├── OrderBookPage.tsx     # Full order book depth
│       │   ├── MarketNewsPage.tsx    # News feed + sentiment
│       │   ├── AIPage.tsx            # AI prediction + options chain
│       │   ├── PaperTradePage.tsx    # Paper trading
│       │   ├── PortfolioPage.tsx     # Portfolio tracker
│       │   └── WatchlistPage.tsx     # Watchlist + alerts
│       ├── services/              # API + WebSocket client
│       ├── types/                 # TypeScript domain types
│       └── utils/chart.ts         # Chart.js helpers
│
├── server/                        # Node.js + Express + TypeScript backend
│   └── src/
│       ├── index.ts               # Entry point
│       ├── app.ts                 # Express app setup
│       ├── controllers/           # marketController, watchlistController
│       ├── middleware/            # errorHandler
│       ├── routes/api.ts          # REST API routes
│       ├── services/              # marketData, livePrice, watchlist, ws
│       └── types/                 # Server-side types
│
├── .env.example                   # Environment variables template
├── docker-compose.yml             # Docker setup
├── setup.sh                       # One-command install script
└── push-to-github.sh              # One-command GitHub push script
```

---

## Tech Stack

**Frontend:** React 18 · TypeScript · Vite · Zustand · Chart.js  
**Backend:** Node.js · Express · TypeScript · WebSocket (ws) · Zod  
**Data:** Zerodha Kite API · Twelve Data API (free tier) · Mock simulator  
**Deploy:** Docker · Nginx · GitHub Actions CI

---

## Getting a Free API Key

For real NSE live prices, get a free key from [Twelve Data](https://twelvedata.com/register) and add it to `.env`. Without a key the app runs in **demo/mock mode** — all features work with simulated data.

---

## Push to GitHub

```bash
bash push-to-github.sh YOUR_GITHUB_USERNAME quantx
```

---

## License

MIT
