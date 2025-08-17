# Crypto Automation Worker

A Cloudflare Worker that provides automated crypto market analysis and trading recommendations via Telegram using KuCoin API.

## 🏗️ Project Structure

The project has been refactored into a clean, modular structure:

```
src/
├── types/           # TypeScript interfaces and types
│   └── index.ts
├── config/          # Configuration constants
│   └── constants.ts
├── utils/           # Utility functions
│   ├── logger.ts    # Logging utilities
│   ├── http.ts      # HTTP utilities with circuit breaker
│   └── helpers.ts   # General helper functions
├── services/        # External service integrations
│   ├── crypto-candles.ts # KuCoin API service
│   ├── news.ts      # News API service
│   ├── gemini.ts    # Gemini AI service
│   └── telegram.ts  # Telegram bot service
├── controllers/     # Business logic controllers
│   ├── analysis.ts  # Main analysis workflow
│   └── api.ts       # HTTP API endpoints
└── worker.ts        # Main worker entry point
```

## 🚀 Features

- **KuCoin API Integration**: Reliable crypto data from KuCoin exchange
- **AI-Powered Analysis**: Google Gemini AI for market sentiment and trading recommendations
- **News Sentiment Analysis**: Real-time crypto news analysis
- **Telegram Delivery**: Automated trading reports via Telegram
- **Modular Architecture**: Clean separation of concerns
- **Error Handling**: Robust error handling with proper logging
- **Type Safety**: Full TypeScript support
- **Scheduled Execution**: Runs every 4 hours via Cloudflare cron

## 📋 Prerequisites

- Node.js 18+ 
- Cloudflare account
- API keys for:
  - Google Gemini AI
  - TheNewsAPI
  - Telegram Bot

## 🛠️ Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Set your API keys as secrets
   wrangler secret put GEMINI_API_KEY
   wrangler secret put THENEWSAPI_KEY
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_CHAT_ID
   ```

3. **Configure optional settings**:
   ```bash
   # Optional: Set custom symbols to analyze
   wrangler secret put SYMBOLS
   # Example: BTC,ETH,SOL,XRP,ADA
   
   # Optional: Set log level
   wrangler secret put LOG_LEVEL
   # Options: debug, info, warn, error
   ```

## 🏃‍♂️ Development

```bash
# Start development server
npm run dev

# Build the project
npm run build

# Clean build artifacts
npm run clean

# Test KuCoin API
npm test
```

## 🚀 Deployment

### **Development**
```bash
npm run dev                  # Local development
```

### **Production**
```bash
npm run deploy               # Deploy to production
```

### **Deployment Script**
```bash
./deploy.sh                  # Automated deployment with checks
```

## 📡 API Endpoints

- `GET /health` - Health check
- `POST /test-telegram` - Test Telegram bot
- `POST /run` - Manually trigger analysis

## ⏰ Scheduled Execution

The worker runs automatically every 4 hours via Cloudflare's cron triggers.

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | - | Google Gemini API key |
| `THENEWSAPI_KEY` | ✅ | - | TheNewsAPI key |
| `TELEGRAM_BOT_TOKEN` | ✅ | - | Telegram bot token |
| `TELEGRAM_CHAT_ID` | ✅ | - | Telegram chat/channel ID |
| `SYMBOLS` | ❌ | BTC,ETH,SOL,XRP,TRX,XLM,ADA,DOT,BNB | Comma-separated list of crypto symbols |
| `LOG_LEVEL` | ❌ | info | Logging level (debug, info, warn, error) |
| `MAX_ARTICLES` | ❌ | 25 | Maximum news articles to analyze |

### Default Symbols

The worker analyzes these cryptocurrencies by default:
- Bitcoin (BTC)
- Ethereum (ETH)
- Solana (SOL)
- Ripple (XRP)
- TRON (TRX)
- Stellar (XLM)
- Cardano (ADA)
- Polkadot (DOT)
- Binance Coin (BNB)

## 🔍 How It Works

### 1. Data Collection
- **KuCoin API**: Fetches real-time price data for all configured cryptocurrencies
- **News API**: Collects recent crypto-related news articles
- **Timeframes**: Analyzes 15m, 1h, and 1d candlestick data

### 2. AI Analysis
- **Sentiment Analysis**: AI analyzes news for market sentiment
- **Technical Analysis**: AI processes price data and generates trading recommendations
- **Risk Management**: Provides entry, stop-loss, and take-profit levels

### 3. Output Delivery
- **Telegram Reports**: Sends formatted trading recommendations
- **Multiple Recommendations**: Both spot and leveraged trading advice
- **Detailed Analysis**: Technical indicators, sentiment, and rationale

## 🏗️ Architecture Benefits

### 1. **Reliability**
- Single, reliable data source (KuCoin API)
- No fallback complexity or mock data
- Clear error handling and logging

### 2. **Maintainability**
- Clean, modular code structure
- Type-safe TypeScript implementation
- Clear separation of concerns

### 3. **Performance**
- Optimized for Cloudflare Workers
- Efficient API usage with rate limiting
- Minimal dependencies

### 4. **Scalability**
- Easy to add new cryptocurrencies
- Configurable analysis parameters
- Extensible architecture

## 🔍 Monitoring

The worker provides structured JSON logging with:
- Timestamp
- Log level
- Service identifier
- Contextual data

Example log entry:
```json
{
  "ts": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "service": "crypto-worker",
  "message": "Successfully fetched from KuCoin",
  "data": { "symbol": "BTCUSDT", "timeframe": "1h", "count": 5 }
}
```

## 🤝 Contributing

1. Follow the existing modular structure
2. Add proper TypeScript types for new features
3. Include error handling and logging
4. Update documentation for new endpoints or configuration

## 📄 License

MIT License - see LICENSE file for details.