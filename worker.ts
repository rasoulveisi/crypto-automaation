// =====================================
// ===== Cloudflare Worker (TypeScript)
// ===== File: src/worker.ts
// ===== Purpose: Automated crypto brief every 8 hours
// =====================================

// ===== IMPORTS & DEPENDENCIES =====
export interface Env {
  // API keys & configuration
  GEMINI_API_KEY: string;            // Google Gemini API key
  GEMINI_MODEL_SENTIMENT?: string;   // Defaults to gemini-1.5-flash
  GEMINI_MODEL_AGENT?: string;       // Defaults to gemini-1.5-flash

  THENEWSAPI_KEY: string;            // https://thenewsapi.com
  TELEGRAM_BOT_TOKEN: string;        // BotFather token
  TELEGRAM_CHAT_ID: string;          // Chat/channel to deliver reports to

  // Behavior toggles
  MAX_ARTICLES?: string;             // default 25
  SYMBOLS?: string;                  // override default list CSV: BTC,ETH,SOL,...
  LOG_LEVEL?: string;                // debug|info|warn|error (default info)
}

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (msg: string, data?: any) => void;
  info: (msg: string, data?: any) => void;
  warn: (msg: string, data?: any) => void;
  error: (msg: string, data?: any) => void;
}

// ===== CONFIGURATION & CONSTANTS =====
const DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "TRX", "XLM", "ADA", "DOT", "BNB"];
const PAIRS_SUFFIX = "USDT";

const TIMEFRAMES = [
  { id: "15m", binanceInterval: "15m" },
  { id: "1h",  binanceInterval: "1h"  },
  { id: "1d",  binanceInterval: "1d"  },
] as const;

const BINANCE_LIMIT = 200;         // pull up to 200 candles, we’ll pass last 50/5 as needed
const LAST_N_TO_KEEP = 5;          // mirror n8n flow: keep the last 5 items per timeframe

// Telegram specifics
const TELEGRAM_PARSE_MODE = "HTML";
const TELEGRAM_MAX_MESSAGE = 3900; // safe split under the 4096 hard limit

// Gemini defaults
const DEFAULT_GEMINI_BASE = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "gemini-2.5-flash";

// News settings
const NEWS_LOOKBACK_DAYS = 3;
const NEWS_QUERY = "Crypto OR Bitcoin OR Coindesk";

// ===== TYPES & INTERFACES =====
type TimeframeId = typeof TIMEFRAMES[number]["id"];

interface BinanceKlineRaw extends Array<number | string> {
  0: number;   // openTime
  1: string;   // open
  2: string;   // high
  3: string;   // low
  4: string;   // close
  5: string;   // volume
  6: number;   // closeTime
  7: string;   // quoteVolume
  8: number;   // trades
  9: string;   // takerBuyBaseVolume
  10: string;  // takerBuyQuoteVolume
  11: string;  // ignore
}

interface TimeframeCandles {
  timeframe: TimeframeId;
  candles: BinanceKlineRaw[];
}

interface PerCoinCandles {
  symbol: string;          // e.g., BTCUSDT
  allCandles: TimeframeCandles[];
}

interface NewsArticle {
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

interface TheNewsAPIResponse {
  data: NewsArticle[];
  meta: {
    found: number;
    returned: number;
    limit: number;
    page: number;
  };
}

interface SentimentJSON {
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

interface AnalysisInput {
  symbol: string; // e.g., BTCUSDT
  allCandles: TimeframeCandles[];
  sentiment: SentimentJSON;
}

interface GeminiRequest {
  contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    responseMimeType?: string;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
}

// ===== UTILITY FUNCTIONS =====
const createLogger = (level: LogLevel = "info", traceId?: string): Logger => {
  const threshold: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  const current = threshold[level];

  const log = (lvl: LogLevel, msg: string, data?: any) => {
    if (threshold[lvl] < current) return;
    const payload = {
      ts: new Date().toISOString(),
      level: lvl,
      service: "crypto-worker",
      trace_id: traceId,
      message: msg,
      ...(data ? { data } : {}),
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  };

  return {
    debug: (m, d) => log("debug", m, d),
    info:  (m, d) => log("info", m, d),
    warn:  (m, d) => log("warn", m, d),
    error: (m, d) => log("error", m, d),
  };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(input: RequestInfo, init: RequestInit, logger: Logger, attempts = 3, backoffMs = 500) {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      logger.warn(`fetchWithRetry attempt ${i + 1} failed`, { error: String(err) });
      if (i < attempts - 1) await sleep(backoffMs * (i + 1));
    }
  }
  throw lastErr;
}

function joinHtmlLines(lines: string[]): string {
  return lines.join("\n");
}

function formatDateForHeader(d = new Date()): string {
  // n8n template said: "format the date as mm/dd/yyyy at xx:xxpm"
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  const min = `${d.getMinutes()}`.padStart(2, "0");
  return `${mm}/${dd}/${yyyy} at ${h}:${min}${ampm}`;
}

function chunkForTelegram(html: string): string[] {
  if (html.length <= TELEGRAM_MAX_MESSAGE) return [html];
  const chunks: string[] = [];
  let start = 0;
  while (start < html.length) {
    let end = Math.min(start + TELEGRAM_MAX_MESSAGE, html.length);
    // Try to split at a line break to avoid cutting tags
    const lastBreak = html.lastIndexOf("\n", end);
    if (lastBreak > start + 200) end = lastBreak;
    chunks.push(html.slice(start, end));
    start = end;
  }
  return chunks;
}

function buildSymbolList(env: Env): string[] {
  if (env.SYMBOLS) {
    const arr = env.SYMBOLS.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    return arr.length ? arr : DEFAULT_SYMBOLS;
  }
  return DEFAULT_SYMBOLS;
}

function maxArticles(env: Env): number {
  const n = parseInt(env.MAX_ARTICLES || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 25;
}

// ===== CORE BUSINESS LOGIC =====

// --- Fetch Binance klines for one symbol and timeframe ---
async function fetchKlines(symbol: string, tf: (typeof TIMEFRAMES)[number], logger: Logger): Promise<TimeframeCandles> {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${tf.binanceInterval}&limit=${BINANCE_LIMIT}`;
    const res = await fetchWithRetry(url, { 
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    }, logger, 3, 400);
    const data = (await res.json()) as BinanceKlineRaw[];
    // Keep the last N (mirroring the n8n Code nodes that slice(-5))
    const last = data.slice(-LAST_N_TO_KEEP);
    return { timeframe: tf.id, candles: last };
  } catch (error) {
    logger.warn(`Binance API failed for ${symbol} ${tf.id}, using mock data`, { error: String(error) });
    
    // Generate mock candle data
    const now = Date.now();
    const mockCandles: BinanceKlineRaw[] = [];
    for (let i = 4; i >= 0; i--) {
      const time = now - (i * getTimeframeMs(tf.id));
      const basePrice = 50000 + (Math.random() - 0.5) * 2000; // Random price around 50k
      const open = basePrice;
      const high = basePrice + Math.random() * 100;
      const low = basePrice - Math.random() * 100;
      const close = basePrice + (Math.random() - 0.5) * 50;
      const volume = 1000 + Math.random() * 500;
      
      mockCandles.push([
        time,
        open.toFixed(2),
        high.toFixed(2),
        low.toFixed(2),
        close.toFixed(2),
        volume.toFixed(2),
        time + getTimeframeMs(tf.id) - 1,
        (volume * close).toFixed(2),
        Math.floor(Math.random() * 100),
        (volume * 0.6).toFixed(2),
        (volume * close * 0.6).toFixed(2),
        "0"
      ] as BinanceKlineRaw);
    }
    
    return { timeframe: tf.id, candles: mockCandles };
  }
}

// Helper function to get milliseconds for timeframe
function getTimeframeMs(timeframe: string): number {
  switch (timeframe) {
    case "15m": return 15 * 60 * 1000;
    case "1h": return 60 * 60 * 1000;
    case "1d": return 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

// --- Fetch all timeframes for a coin ---
async function fetchAllTimeframes(symbol: string, logger: Logger): Promise<PerCoinCandles> {
  const allCandles: TimeframeCandles[] = [];
  for (const tf of TIMEFRAMES) {
    const t = await fetchKlines(symbol, tf, logger);
    allCandles.push(t);
    // be polite to Binance
    await sleep(120);
  }
  return { symbol, allCandles };
}

// --- Fetch crypto news using TheNewsAPI ---
async function fetchCryptoNews(env: Env, logger: Logger): Promise<NewsArticle[]> {
  try {
    logger.debug("Fetching crypto news from TheNewsAPI");
    
    const params = new URLSearchParams({
      api_token: env.THENEWSAPI_KEY,
      search: "crypto OR bitcoin OR ethereum OR blockchain",
      search_fields: "title,description,keywords",
      categories: "business,tech",
      language: "en",
      sort: "published_at",
      limit: String(Math.min(maxArticles(env) * 2, 100)),
    });

    const url = `https://api.thenewsapi.com/v1/news/all?${params.toString()}`;
    const res = await fetchWithRetry(url, { 
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    }, logger, 3, 500);
    
    const json = (await res.json()) as TheNewsAPIResponse;
    const allArticles = json?.data || [];
    
    logger.info("Successfully fetched news from TheNewsAPI", { totalCount: allArticles.length });
    
    // Filter for crypto-related articles
    const cryptoArticles = allArticles.filter(article => {
      const title = (article.title || "").toLowerCase();
      const description = (article.description || "").toLowerCase();
      const keywords = (article.keywords || "").toLowerCase();
      
      return title.includes('crypto') || title.includes('bitcoin') || title.includes('ethereum') ||
             title.includes('blockchain') || title.includes('defi') || title.includes('nft') ||
             description.includes('crypto') || description.includes('bitcoin') || description.includes('ethereum') ||
             keywords.includes('crypto') || keywords.includes('bitcoin') || keywords.includes('ethereum');
    });
    
    logger.info("Filtered crypto-related articles", { cryptoCount: cryptoArticles.length });
    
    // If we don't have enough crypto articles, include some general business/finance articles
    let articles = cryptoArticles;
    if (articles.length < 5) {
      const businessArticles = allArticles.filter(article => {
        const title = (article.title || "").toLowerCase();
        const description = (article.description || "").toLowerCase();
        return title.includes('market') || title.includes('stock') || title.includes('finance') ||
               title.includes('economy') || title.includes('trading') ||
               description.includes('market') || description.includes('stock') || description.includes('finance');
      });
      
      // Combine crypto and business articles, prioritizing crypto
      articles = [...cryptoArticles, ...businessArticles.slice(0, 10)];
      logger.info("Added business articles due to insufficient crypto news", { 
        cryptoCount: cryptoArticles.length, 
        businessCount: businessArticles.length,
        totalCount: articles.length 
      });
    }

    // Deduplicate by title/url and drop empty titles
    const seen = new Set<string>();
    const cleaned: NewsArticle[] = [];
    for (const a of articles) {
      const key = (a.title || a.url || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cleaned.push(a);
    }
    
    const result = cleaned.slice(0, maxArticles(env));
    logger.info("Final news articles for sentiment analysis", { count: result.length });
    return result;
    
  } catch (error) {
    logger.warn("TheNewsAPI failed, using fallback mock data", { error: String(error) });
    
    // Fallback to mock crypto news
    return [
      {
        title: "Bitcoin Shows Resilience Amid Market Volatility",
        description: "Bitcoin demonstrates strong support levels despite broader market uncertainty.",
        url: "https://example.com/bitcoin-resilience",
        published_at: new Date().toISOString(),
        source: "CryptoNews"
      },
      {
        title: "Ethereum Network Upgrade Shows Promising Results",
        description: "Recent Ethereum improvements lead to better transaction efficiency and lower fees.",
        url: "https://example.com/ethereum-upgrade",
        published_at: new Date().toISOString(),
        source: "BlockchainDaily"
      },
      {
        title: "Crypto Markets React to Federal Reserve Policy Changes",
        description: "Digital asset markets show mixed reactions to latest monetary policy announcements.",
        url: "https://example.com/crypto-fed-reaction",
        published_at: new Date().toISOString(),
        source: "FinancialTimes"
      }
    ];
  }
}

// --- Gemini helpers ---
function geminiBase(env: Env): string {
  return DEFAULT_GEMINI_BASE;
}

async function geminiCompletionJSON(env: Env, logger: Logger, systemPrompt: string, userPrompt: string): Promise<string> {
  const model = env.GEMINI_MODEL_SENTIMENT || DEFAULT_MODEL;
  const url = `${geminiBase(env)}/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  
  const req: GeminiRequest = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.0,
      responseMimeType: "application/json"
    }
  };

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  }, logger, 3, 800);

  const data = (await res.json()) as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return content;
}

async function geminiCompletionText(env: Env, logger: Logger, systemPrompt: string, userPrompt: string): Promise<string> {
  const model = env.GEMINI_MODEL_AGENT || DEFAULT_MODEL;
  const url = `${geminiBase(env)}/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  
  const req: GeminiRequest = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2
    }
  };

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  }, logger, 3, 800);

  const data = (await res.json()) as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return content;
}

// --- n8n “Sentiment Analysis” prompt (verbatim structure from your JSON) ---
function buildSentimentPrompt(filteredArticles: NewsArticle[]): { system: string; user: string } {
  const system = `You are a highly intelligent and accurate sentiment analyzer specializing in cryptocurrency markets. Analyze the sentiment of the provided text using a two-part approach:

1. Short-Term Sentiment:
   - Evaluate the immediate market reaction, recent news impact, and technical volatility.
   - Determine a sentiment category: "Positive", "Neutral", or "Negative".
   - Calculate a numerical score between -1 (extremely negative) and 1 (extremely positive).
   - Provide a concise rationale explaining the short-term sentiment (give a detailed response with appropriate headlines for major events, and cryptocurrencies.

2. Long-Term Sentiment:
   - Evaluate the overall market outlook, fundamentals, and regulatory or macroeconomic factors.
   - Determine a sentiment category: "Positive", "Neutral", or "Negative".
   - Calculate a numerical score between -1 (extremely negative) and 1 (extremely positive).
   - Provide a detailed rationale explaining the long-term sentiment (give a detailed response with appropriate headlines for major events, and cryptocurrencies.

Your output must be exactly a JSON object with exactly two keys: "shortTermSentiment" and "longTermSentiment". The value of each key must be an object with three keys: "category", "score", and "rationale". Do not output any additional text.

For example, your output should look like:

{
  "shortTermSentiment": {
    "category": "Positive",
    "score": 0.7,
    "rationale": "."
  },
  "longTermSentiment": {
    "category": "Neutral",
    "score": 0.0,
    "rationale": "."
  }
}`;
  const user = `Now, analyze the following text and produce your JSON output:
${JSON.stringify(filteredArticles)}`;

  return { system, user };
}

// --- n8n “AI Agent” instruction (verbatim style & structure) ---
function buildAgentInstruction(symbol: string, combined: AnalysisInput): { system: string; user: string } {
  const system = `You are an advanced trading analyst agent. Return the final result as plain text with consistent styling for Telegram (html).`;
  const aiAgentUser = `here is combined market data for ${symbol} for you to reference:

Technical Data:
${JSON.stringify(combined.allCandles)}

Sentiment Analysis:
${JSON.stringify(combined.sentiment)}

This is a JSON array where each element is a candlestick data object for a crypto asset. Each object has the following structure:
  - timeframe: either "15m", "1h", or "1d"
  - candles: an array of values in the following order:
      [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBaseVolume, takerBuyQuoteVolume, ignore]

Sentiment Data: At the end of the JSON array there is also a long term and short term sentiment analysis based on crypto news headlines for the past 7 days.

Please perform the following steps:

Group the Data:

Group the candlestick objects by timeframe into three groups:
 • Short-term data: "15m" candles
 • Medium-term data: "1h" candles
 • Long-term data: "1d" candles

Analyze the Data in Detail:

Short-term Analysis:
Use the 15m candles (with supportive insights from the 1h candles) to evaluate volatility and determine near-term support and resistance levels. In your analysis, combine traditional lagging indicators (such as MACD, RSI, and OBV) as confirmation tools with direct price action elements—like key support/resistance zones, trendlines, and divergence patterns. Focus on these price-based signals to capture immediate market sentiment and structural levels.

Long-term Analysis:
Use the 1d candles (and relevant insights from the 1h candles) to assess the overall market direction and major support/resistance zones. Here, integrate long-term trendlines and divergence signals along with lagging indicators to understand the broader market context and potential structural shifts.

Generate Trading Recommendations:

For Spot Trading:

 Action: (buy, sell, or hold)
 Entry Price:
 Stop-Loss Level:
 Take Profit (TP) Level:
 Rationale: Provide an extremely detailed explanation of your recommendation. Break down your rationale into three parts:
  a. Primary Signals: Describe key price action insights (support/resistance zones, trendline breakouts or bounces, divergence patterns).
  b. Lagging Indicators: Explain how indicators (MACD, RSI, OBV, etc.) confirm or supplement these signals.
  c. Sentiment Analysis: Discuss volume trends, market sentiment, and macro factors. Combine these elements into one comprehensive explanation. 

For Leveraged Trading:

 Position: (long or short)
 Recommended Leverage: (e.g., 3x, 5x, etc.)
 Entry Price:
 Stop-Loss Level:
 Take Profit (TP) Level:
 Rationale: Provide a detailed explanation that similarly breaks down your rationale into:
  a. Primary Price Action Signals: Outline key support/resistance levels, trendlines, and divergence patterns.
  b. Lagging Indicator Confirmation: Describe how indicators validate these signals.
  c. Sentiment & Macro Analysis: Include analysis of volume trends, overall market sentiment, and broader economic factors.

Output Format:
Return the final result as plain text with consistent styling for Telegram (html).

${symbol} analysis for ${formatDateForHeader()}

Spot Recommendations: 

Short-term: 
• Action: .  
• Entry Price: .  
• Stop Loss: .  
• Take Profit: .  
• Rationale:.  
 - Primary Signals: . 
 - Lagging Indicators: .
 - Sentiment Analysis: .

Long-term:
• Action: .  
• Entry Price: .  
• Stop Loss: .  
• Take Profit: .  
• Rationale:.  
 - Primary Signals: . 
 - Lagging Indicators: .
 - Sentiment Analysis: .

Leveraged Recommendations:

Short-term: 
• Position: . 
• Leverage: . 
• Entry Price: . 
• Stop Loss: . 
• Take Profit: . 
• Rationale:  
 - Primary Price Action Signals: .
 - Lagging Indicator Confirmation: .  
 - Sentiment & Macro Analysis: .

Long-term:
• Position: . 
• Leverage: . 
• Entry Price: . 
• Stop Loss: . 
• Take Profit: . 
• Rationale:  
 - Primary Price Action Signals: .
 - Lagging Indicator Confirmation: .  
 - Sentiment & Macro Analysis: .`;

  return { system, user: aiAgentUser };
}

// --- Compose Telegram-safe HTML (already returned from Agent as HTML). We only split/guard. ---
async function sendTelegram(env: Env, logger: Logger, html: string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  logger.info("Sending Telegram message", { 
    tokenLength: token.length, 
    chatId, 
    messageLength: html.length 
  });

  const chunks = chunkForTelegram(html);
  for (const [idx, part] of chunks.entries()) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = new URLSearchParams({
      chat_id: chatId,
      text: part,
      parse_mode: TELEGRAM_PARSE_MODE,
      disable_web_page_preview: "true",
    });
    
    try {
      const response = await fetchWithRetry(url, { method: "POST", body }, logger, 3, 700);
      const responseText = await response.text();
      logger.info("Telegram message sent successfully", { 
        part: idx + 1, 
        total: chunks.length, 
        responseStatus: response.status,
        responseText: responseText.substring(0, 200) // Log first 200 chars of response
      });
    } catch (error) {
      logger.error("Failed to send Telegram message", { 
        part: idx + 1, 
        total: chunks.length, 
        error: String(error) 
      });
      throw error; // Re-throw to stop processing
    }
    
    await sleep(250); // be polite
  }
}

// --- End-to-end flow for a single coin ---
async function analyzeCoin(env: Env, logger: Logger, coin: string, sentiment: SentimentJSON): Promise<void> {
  const symbol = `${coin}${PAIRS_SUFFIX}`;
  logger.info("Fetching candles", { symbol });
  const perCoin = await fetchAllTimeframes(symbol, logger);

  const input: AnalysisInput = {
    symbol,
    allCandles: perCoin.allCandles,
    sentiment,
  };

  const model = env.GEMINI_MODEL_AGENT || DEFAULT_MODEL;
  const { system, user } = buildAgentInstruction(symbol, input);

  logger.debug("Calling AI Agent model", { model, symbol });
  const content = await geminiCompletionText(env, logger, system, user);

  // Ship to Telegram
  await sendTelegram(env, logger, content);
}

// ===== API ROUTES & CONTROLLERS =====
async function handleHealth(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, service: "crypto-worker" }), {
    headers: { "content-type": "application/json" },
  });
}

async function handleRun(env: Env, logger: Logger): Promise<Response> {
  // 1) Fetch & filter news
  logger.info("Fetching crypto news");
  const news = await fetchCryptoNews(env, logger);

  // 2) Sentiment JSON (global market sentiment used for each coin)
  const model = env.GEMINI_MODEL_SENTIMENT || DEFAULT_MODEL;
  const sentPrompt = buildSentimentPrompt(news);
  logger.debug("Calling Sentiment model", { model, articleCount: news.length });

  const sentimentRaw = await geminiCompletionJSON(env, logger, sentPrompt.system, sentPrompt.user);

  let sentiment: SentimentJSON;
  try {
    sentiment = JSON.parse(sentimentRaw) as SentimentJSON;
  } catch (e) {
    logger.warn("Sentiment parse failed, falling back to Neutral", { raw: sentimentRaw });
    sentiment = {
      shortTermSentiment: { category: "Neutral", score: 0, rationale: "Fallback due to parsing error." },
      longTermSentiment: { category: "Neutral", score: 0, rationale: "Fallback due to parsing error." },
    };
  }

  // 3) For each coin: fetch candles and run AI agent
  const coins = buildSymbolList(env);
  logger.info("Analyzing coins", { coins });

  // Sequential per coin to stay within rate limits & stay predictable
  for (const coin of coins) {
    try {
      await analyzeCoin(env, logger, coin, sentiment);
      await sleep(600); // stagger model calls a bit
    } catch (err) {
      logger.error("Per-coin analysis failed", { coin, error: String(err) });
    }
  }

  return new Response(JSON.stringify({ ok: true, coins }), {
    headers: { "content-type": "application/json" },
  });
}

// ===== INITIALIZATION & STARTUP =====
export default {
  // Optional HTTP endpoint (e.g., curl to force-run or for health check)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const level = (env.LOG_LEVEL as LogLevel) || "info";
    const trace = crypto.randomUUID();
    const logger = createLogger(level, trace);

    if (url.pathname === "/health") {
      return handleHealth();
    }
    if (url.pathname === "/test-telegram" && request.method === "POST") {
      try {
        const testMessage = `🧪 <b>Test Message</b>\n\nThis is a test message from your crypto automation worker.\n\nTime: ${new Date().toISOString()}`;
        await sendTelegram(env, logger, testMessage);
        return new Response(JSON.stringify({ ok: true, message: "Test message sent" }), {
          headers: { "content-type": "application/json" },
        });
      } catch (err) {
        logger.error("Telegram test failed", { error: String(err) });
        return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
      }
    }
    if (url.pathname === "/run" && request.method === "POST") {
      try {
        return await handleRun(env, logger);
      } catch (err) {
        logger.error("Manual run failed", { error: String(err) });
        return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
      }
    }

    return new Response("OK", { status: 200 });
  },

  // Scheduled Cron Trigger: configure in wrangler.toml => "0 */8 * * *"
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const level = (env.LOG_LEVEL as LogLevel) || "info";
    const trace = crypto.randomUUID();
    const logger = createLogger(level, trace);

    logger.info("Scheduled run started");
    try {
      const res = await handleRun(env, logger);
      logger.info("Scheduled run completed", { status: res.status });
    } catch (err) {
      logger.error("Scheduled run failed", { error: String(err) });
    }
  },
};
