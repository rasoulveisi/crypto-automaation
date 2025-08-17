// =====================================
// ===== GEMINI AI SERVICE
// =====================================

import { Logger, Env, GeminiRequest, GeminiResponse, NewsArticle, AnalysisInput } from '../types';
import { DEFAULT_GEMINI_BASE, DEFAULT_MODEL } from '../config/constants';
import { fetchWithRetryEnhanced } from '../utils/http';
import { formatDateForHeader } from '../utils/helpers';

// Gemini API helpers
export function geminiBase(env: Env): string {
  return DEFAULT_GEMINI_BASE;
}

// Generate JSON response from Gemini
export async function geminiCompletionJSON(
  env: Env, 
  logger: Logger, 
  systemPrompt: string, 
  userPrompt: string
): Promise<string> {
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

  const res = await fetchWithRetryEnhanced(
    url, 
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    }, 
    logger, 
    3, 
    800
  );

  const data = (await res.json()) as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return content;
}

// Generate text response from Gemini
export async function geminiCompletionText(
  env: Env, 
  logger: Logger, 
  systemPrompt: string, 
  userPrompt: string
): Promise<string> {
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

  const res = await fetchWithRetryEnhanced(
    url, 
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    }, 
    logger, 
    3, 
    800
  );

  const data = (await res.json()) as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return content;
}

// Build sentiment analysis prompt
export function buildSentimentPrompt(filteredArticles: NewsArticle[]): { system: string; user: string } {
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

// Build AI agent instruction
export function buildAgentInstruction(symbol: string, combined: AnalysisInput): { system: string; user: string } {
  const system = `You are a highly intelligent and accurate cryptocurrency market analyst specializing in technical analysis and trading recommendations. Your expertise includes:

1. Technical Analysis:
   - Price action analysis (support/resistance, trendlines, patterns)
   - Volume analysis and market structure
   - Multi-timeframe analysis (15m, 1h, 1d)
   - Risk management and position sizing

2. Market Sentiment:
   - Integration of news sentiment with technical analysis
   - Macro-economic factors affecting crypto markets
   - Market psychology and crowd behavior

3. Trading Strategy:
   - Spot trading recommendations
   - Leveraged trading with proper risk management
   - Entry, stop-loss, and take-profit levels
   - Position sizing and leverage recommendations

Your analysis must be:
- Data-driven and objective
- Risk-aware with proper stop-loss levels
- Clear and actionable for traders
- Based on both technical and fundamental factors

Output your analysis in a structured format suitable for Telegram delivery.`;

  const aiAgentUser = `here is combined market data for ${symbol} for you to reference:

Technical Data:
${JSON.stringify(combined.allCandles)}

Sentiment Analysis:
${JSON.stringify(combined.sentiment)}

This data contains candlestick information from KuCoin API in the following format:
- timeframe: "15m", "1h", or "1d"
- candles: Array of objects with:
  - timestamp: Unix timestamp in milliseconds
  - open: Opening price
  - high: Highest price
  - low: Lowest price
  - close: Closing price
  - volume: Trading volume
  - amount: Quote volume (USDT amount)

Sentiment Data: Contains short-term and long-term sentiment analysis based on crypto news headlines.

Please perform the following analysis:

Group the Data:
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
• Action: (buy, sell, or hold)
• Entry Price:
• Stop-Loss Level:
• Take Profit (TP) Level:
• Rationale: Provide an extremely detailed explanation of your recommendation. Break down your rationale into three parts:
  a. Primary Signals: Describe key price action insights (support/resistance zones, trendline breakouts or bounces, divergence patterns).
  b. Lagging Indicators: Explain how indicators (MACD, RSI, OBV, etc.) confirm or supplement these signals.
  c. Sentiment Analysis: Discuss volume trends, market sentiment, and macro factors. Combine these elements into one comprehensive explanation. 

For Leveraged Trading:
• Position: (long or short)
• Recommended Leverage: (e.g., 3x, 5x, etc.)
• Entry Price:
• Stop-Loss Level:
• Take Profit (TP) Level:
• Rationale: Provide a detailed explanation that similarly breaks down your rationale into:
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
