# Crypto Automation Cloudflare Worker

A comprehensive Cloudflare Worker that automatically analyzes cryptocurrency markets and news every 8 hours, providing trading insights via Telegram.

## Features

- **Automated Execution**: Runs every 8 hours via cron trigger
- **Multi-Crypto Analysis**: Analyzes BTC, ETH, SOL, XRP, TRX, XLM, ADA, DOT, BNB
- **Technical Analysis**: Fetches OHLCV data from Binance (15m, 1h, 1d timeframes)
- **News Sentiment**: Analyzes crypto news from NewsAPI
- **AI-Powered Insights**: Uses OpenAI for sentiment analysis and trading recommendations
- **Telegram Delivery**: Sends formatted HTML reports to Telegram channels
- **Error Handling**: Continues processing if individual coins fail
- **Manual Triggers**: `/run` endpoint for manual execution
- **Health Checks**: `/health` endpoint for monitoring

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Set the following secrets using Wrangler:

```bash
# Gemini API (for sentiment analysis and trading insights)
wrangler secret put GEMINI_API_KEY

# NewsAPI (for crypto news)
wrangler secret put NEWSAPI_KEY

# Telegram Bot (for message delivery)
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

### 3. Optional Configuration

You can also set these optional environment variables:

```bash
# Custom models (defaults to gemini-1.5-flash)
wrangler secret put GEMINI_MODEL_SENTIMENT
wrangler secret put GEMINI_MODEL_AGENT
```

# Custom symbols (defaults to BTC,ETH,SOL,XRP,TRX,XLM,ADA,DOT,BNB)
wrangler secret put SYMBOLS

# Max articles to analyze (defaults to 25)
wrangler secret put MAX_ARTICLES

# Log level (debug|info|warn|error, defaults to info)
wrangler secret put LOG_LEVEL
```

### 4. Deploy

```bash
# Deploy to production
npm run deploy:production

# Or deploy to staging first
npm run deploy:staging
```

## API Endpoints

### Health Check
```bash
curl https://your-worker.your-subdomain.workers.dev/health
```

### Manual Execution
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/run
```

## Configuration Details

### Supported Cryptocurrencies
- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)
- XRP (Ripple)
- TRX (TRON)
- XLM (Stellar)
- ADA (Cardano)
- DOT (Polkadot)
- BNB (Binance Coin)

### Timeframes
- 15-minute (15m) - Short-term analysis
- 1-hour (1h) - Medium-term analysis
- 1-day (1d) - Long-term analysis

### News Analysis
- **Source**: NewsAPI
- **Keywords**: "Crypto OR Bitcoin OR Coindesk"
- **Timeframe**: Last 3 days
- **Articles**: ~25 articles (configurable)

### AI Analysis Output

#### Sentiment Analysis (JSON)
```json
{
  "shortTermSentiment": {
    "category": "Positive|Neutral|Negative",
    "score": -1.0 to 1.0,
    "rationale": "Detailed explanation"
  },
  "longTermSentiment": {
    "category": "Positive|Neutral|Negative", 
    "score": -1.0 to 1.0,
    "rationale": "Detailed explanation"
  }
}
```

#### Trading Analysis (HTML)
- Spot trading recommendations (buy/sell/hold)
- Leveraged trading recommendations (long/short)
- Entry prices, stop-loss, take-profit levels
- Detailed rationale with technical indicators

## Development

### Local Development
```bash
npm run dev
```

### Testing
```bash
# Test health endpoint
curl http://localhost:8787/health

# Test manual run
curl -X POST http://localhost:8787/run
```

## Monitoring

The worker includes comprehensive logging with:
- Unique trace IDs for each execution
- Structured JSON logs
- Error tracking per cryptocurrency
- Performance metrics

## Rate Limits & Considerations

- **Binance API**: 120ms delay between requests
- **NewsAPI**: 3 retry attempts with exponential backoff
- **OpenAI**: 800ms delay between requests
- **Telegram**: 250ms delay between messages
- **Message Splitting**: Automatic for messages >3900 characters

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**: Check your API key and quota
2. **NewsAPI Errors**: Verify your API key and subscription
3. **Telegram Errors**: Ensure bot token and chat ID are correct
4. **Rate Limiting**: The worker includes built-in delays to respect API limits

### Logs
Check Cloudflare Workers logs in the dashboard or use:
```bash
wrangler tail
```

## License

MIT License
