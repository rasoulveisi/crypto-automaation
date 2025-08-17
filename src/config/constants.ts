// =====================================
// ===== CONFIGURATION & CONSTANTS
// =====================================

// Default symbols to analyze
export const DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "TRX", "XLM", "ADA", "DOT", "BNB"];
export const PAIRS_SUFFIX = "USDT";

// KuCoin API settings
export const KUCOIN_BASE_URL = "https://api.kucoin.com";
export const KUCOIN_REQUEST_DELAY_MS = 100; // Delay between requests to be polite
export const LAST_N_TO_KEEP = 5;             // Keep the last 5 candles per timeframe

// Telegram settings
export const TELEGRAM_PARSE_MODE = "HTML";
export const TELEGRAM_MAX_MESSAGE = 3900; // Safe split under the 4096 hard limit

// Gemini API settings
export const DEFAULT_GEMINI_BASE = "https://generativelanguage.googleapis.com";
export const DEFAULT_MODEL = "gemini-2.5-flash";

// News API settings
export const NEWS_LOOKBACK_DAYS = 3;
export const NEWS_QUERY = "Crypto OR Bitcoin OR Coindesk";

// Timeframe milliseconds mapping
export const TIMEFRAME_MS: Record<string, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

// API endpoints
export const KUCOIN_BASE_URL_FULL = "https://api.kucoin.com";
export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
export const THENEWSAPI_BASE_URL = "https://api.thenewsapi.com";
export const TELEGRAM_BASE_URL = "https://api.telegram.org";
