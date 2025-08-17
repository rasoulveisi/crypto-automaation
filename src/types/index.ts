// =====================================
// ===== TYPES & INTERFACES
// =====================================

export interface Env {
  // API keys & configuration
  GEMINI_API_KEY: string;            // Google Gemini API key
  GEMINI_MODEL_SENTIMENT?: string;   // Defaults to gemini-2.5-flash
  GEMINI_MODEL_AGENT?: string;       // Defaults to gemini-2.5-flash

  THENEWSAPI_KEY: string;            // https://thenewsapi.com
  TELEGRAM_BOT_TOKEN: string;        // BotFather token
  TELEGRAM_CHAT_ID: string;          // Chat/channel to deliver reports to

  // Behavior toggles
  MAX_ARTICLES?: string;             // default 25
  SYMBOLS?: string;                  // override default list CSV: BTC,ETH,SOL,...
  LOG_LEVEL?: string;                // debug|info|warn|error (default info)
  
  // Performance configuration
  ENABLE_CIRCUIT_BREAKER?: string;   // default true
  MAX_CONCURRENT_REQUESTS?: string;  // default 3
  REQUEST_TIMEOUT_MS?: string;       // default 30000
  ENABLE_CACHE?: string;             // default true
  CACHE_TTL_SECONDS?: string;        // default 300 (5 minutes)
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug: (msg: string, data?: any) => void;
  info: (msg: string, data?: any) => void;
  warn: (msg: string, data?: any) => void;
  error: (msg: string, data?: any) => void;
}

// Timeframe types
export const TIMEFRAMES = [
  { id: "15m", kucoinType: "15min" },
  { id: "1h",  kucoinType: "1hour" },
  { id: "1d",  kucoinType: "1day"  },
] as const;

export type TimeframeId = typeof TIMEFRAMES[number]["id"];

// KuCoin data types
export interface KuCoinKlineRaw extends Array<string> {
  0: string;   // timestamp
  1: string;   // open
  2: string;   // close
  3: string;   // high
  4: string;   // low
  5: string;   // volume
  6: string;   // amount
}

// Simplified KuCoin candle format (no conversion needed)
export interface KuCoinCandle {
  timestamp: number;    // Unix timestamp in milliseconds
  open: string;         // Open price
  high: string;         // High price
  low: string;          // Low price
  close: string;        // Close price
  volume: string;       // Volume
  amount: string;       // Quote volume (amount)
}

export interface TimeframeCandles {
  timeframe: TimeframeId;
  candles: KuCoinCandle[];
}

export interface PerCoinCandles {
  symbol: string;          // e.g., BTCUSDT
  allCandles: TimeframeCandles[];
}

// News types
export interface NewsArticle {
  uuid?: string;
  title?: string | null;
  description?: string | null;
  snippet?: string | null;
  url?: string | null;
  image_url?: string | null;
  published_at?: string | null;
  source?: string;
  categories?: string[];
  keywords?: string;
}

export interface TheNewsAPIResponse {
  data: NewsArticle[];
  meta: {
    found: number;
    returned: number;
    limit: number;
    page: number;
  };
}

// Sentiment types
export interface SentimentJSON {
  shortTermSentiment: {
    category: "Positive" | "Neutral" | "Negative";
    score: number; // -1..1
    rationale: string;
  };
  longTermSentiment: {
    category: "Positive" | "Neutral" | "Negative";
    score: number; // -1..1
    rationale: string;
  };
}

export interface AnalysisInput {
  symbol: string; // e.g., BTCUSDT
  allCandles: TimeframeCandles[];
  sentiment: SentimentJSON;
}

// Gemini API types
export interface GeminiRequest {
  contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    responseMimeType?: string;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
}
