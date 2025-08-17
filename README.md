# Crypto Automation Worker

A Cloudflare Worker that provides automated crypto market analysis and trading recommendations via Telegram using KuCoin API and Google Gemini AI.

## 🏗️ Project Structure

The project follows a clean, modular architecture:

```
src/
├── types/           # TypeScript interfaces and types
│   └── index.ts
├── config/          # Configuration constants
│   └── constants.ts
├── utils/           # Utility functions
│   ├── logger.ts    # Logging utilities
│   ├── http.ts      # HTTP utilities with retry logic
│   └── helpers.ts   # General helper functions
├── services/        # External service integrations
│   ├── crypto-candles.ts # KuCoin API service
│   ├── news.ts      # TheNewsAPI service
│   ├── gemini.ts    # Google Gemini AI service
│   └── telegram.ts  # Telegram bot service
├── controllers/     # Business logic controllers
│   ├── analysis.ts  # Main analysis workflow
│   └── api.ts       # HTTP API endpoints
└── worker.ts        # Main worker entry point
```

## 🚀 Features

- **KuCoin API Integration**: Single data source for reliable crypto market data
- **AI-Powered Analysis**: Google Gemini 2.5 Flash for sentiment and trading analysis
- **News Sentiment Analysis**: Real-time crypto news analysis via TheNewsAPI
- **Telegram Delivery**: Automated trading reports with error notifications
- **Error Handling**: Comprehensive error handling with Telegram notifications
- **Type Safety**: Full TypeScript support with strict typing
- **Scheduled Execution**: Runs every 4 hours via Cloudflare cron triggers
- **Rate Limiting**: Polite API usage with configurable delays

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

2. **Configure wrangler.toml**:
   ```bash
   # Copy the example configuration
   cp wrangler.toml.example wrangler.toml
   
   # Edit the configuration if needed
   # (Optional: customize SYMBOLS, LOG_LEVEL, MAX_ARTICLES)
   ```

3. **Set up API keys as secrets**:
   ```bash
   # Login to Cloudflare
   wrangler login
   
   # Set your API keys as secrets
   wrangler secret put GEMINI_API_KEY
   wrangler secret put THENEWSAPI_KEY
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_CHAT_ID
   ```

4. **Optional: Configure custom settings**:
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

- `GET /` - Project info and available endpoints
- `GET /health` - Health check
- `POST /test-telegram` - Test Telegram bot
- `POST /run` - Manually trigger analysis

## ⏰ Scheduled Execution

The worker runs automatically every 4 hours via Cloudflare's cron triggers (`0 */4 * * *`).

## 🔧 Configuration

### Environment Variables

The configuration is managed through `wrangler.toml` and Cloudflare secrets:

#### **Required Secrets** (set using `wrangler secret put`)
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `THENEWSAPI_KEY` | TheNewsAPI key |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat/channel ID |

#### **Optional Configuration** (defaults in wrangler.toml)
| Variable | Default | Description |
|----------|---------|-------------|
| `SYMBOLS` | BTC,ETH,SOL,XRP,TRX,XLM,ADA,DOT,BNB | Comma-separated list of crypto symbols |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |
| `MAX_ARTICLES` | 25 | Maximum news articles to analyze |

#### **Advanced Configuration** (optional environment variables)
| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_MODEL_SENTIMENT` | gemini-2.5-flash | AI model for sentiment analysis |
| `GEMINI_MODEL_AGENT` | gemini-2.5-flash | AI model for trading analysis |
| `ENABLE_CIRCUIT_BREAKER` | true | Enable HTTP circuit breaker |
| `MAX_CONCURRENT_REQUESTS` | 3 | Maximum concurrent API requests |
| `REQUEST_TIMEOUT_MS` | 30000 | HTTP request timeout |
| `ENABLE_CACHE` | true | Enable response caching |
| `CACHE_TTL_SECONDS` | 300 | Cache TTL in seconds |

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

### Timeframes

The system analyzes multiple timeframes:
- **15m** - Short-term analysis
- **1h** - Medium-term analysis  
- **1d** - Long-term analysis

## 🔍 How It Works

### 1. Data Collection
- **KuCoin API**: Fetches real-time candlestick data for all configured cryptocurrencies
- **TheNewsAPI**: Collects recent crypto-related news articles with intelligent filtering
- **Timeframes**: Analyzes 15m, 1h, and 1d candlestick data (last 5 candles per timeframe)

### 2. AI Analysis
- **Sentiment Analysis**: AI analyzes news for market sentiment (short-term and long-term)
- **Technical Analysis**: AI processes price data and generates trading recommendations
- **Risk Management**: Provides entry, stop-loss, and take-profit levels

### 3. Output Delivery
- **Telegram Reports**: Sends formatted trading recommendations
- **Error Notifications**: Real-time error alerts via Telegram
- **Summary Reports**: Analysis completion summaries

## 🏗️ Architecture Benefits

### 1. **Reliability**
- Single, reliable data source (KuCoin API)
- No fallback complexity or mock data
- Clear error handling and logging
- Comprehensive error notifications

### 2. **Maintainability**
- Clean, modular code structure
- Type-safe TypeScript implementation
- Clear separation of concerns
- Simplified data formats

### 3. **Performance**
- Optimized for Cloudflare Workers
- Efficient API usage with rate limiting (100ms delays)
- Minimal dependencies
- Polite API usage patterns

### 4. **Scalability**
- Easy to add new cryptocurrencies
- Configurable analysis parameters
- Extensible architecture
- Sequential processing to stay within rate limits

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

## 🚨 Error Handling

The system provides comprehensive error handling:

### **Error Types**
- **News API Error** - TheNewsAPI failures
- **AI Sentiment Error** - Gemini AI sentiment analysis failures
- **AI Response Error** - Invalid AI response parsing
- **Crypto Data Error** - KuCoin API failures
- **System Error** - General workflow failures

### **Error Flow**
1. **Error Detection** - All critical operations wrapped in try-catch
2. **Telegram Notification** - Detailed error messages sent to Telegram
3. **Graceful Degradation** - Continue processing other coins if one fails
4. **Summary Reporting** - Final status report with success/failure counts

## 📊 Data Processing

### **KuCoin Data**
- **Format**: Simplified KuCoin candle objects (no unnecessary conversion)
- **Timeframes**: 15m, 1h, 1d
- **Data Points**: Last 5 candles per timeframe
- **Rate Limiting**: 100ms delay between requests

### **News Processing**
- **Source**: TheNewsAPI with intelligent filtering
- **Categories**: Business and tech news
- **Filtering**: Crypto-related articles prioritized
- **Fallback**: Business/finance articles if insufficient crypto news

### **AI Analysis**
- **Sentiment Model**: gemini-2.5-flash for news sentiment
- **Trading Model**: gemini-2.5-flash for technical analysis
- **Temperature**: 0.0 for sentiment, 0.2 for trading analysis
- **Retry Logic**: 3 attempts with exponential backoff

## 🤝 Contributing

1. Follow the existing modular structure
2. Add proper TypeScript types for new features
3. Include error handling and logging
4. Update documentation for new endpoints or configuration

## 📄 License

MIT License - see LICENSE file for details.